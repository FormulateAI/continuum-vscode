import * as vscode from 'vscode';
import { ChildProcess, spawn, execFile } from 'child_process';
import axios from 'axios';

export class ServerManager {
  private process: ChildProcess | undefined;
  private outputChannel: vscode.OutputChannel;
  private restartCount = 0;
  private readonly maxAutoRestarts = 3;

  constructor(private context: vscode.ExtensionContext) {
    this.outputChannel = vscode.window.createOutputChannel('Continuum Server');
    context.subscriptions.push(this.outputChannel);
  }

  private getPort(): number {
    return vscode.workspace
      .getConfiguration('continuum')
      .get<number>('serverPort', 8111);
  }

  private getServerUrl(): string {
    return `http://localhost:${this.getPort()}`;
  }

  async ensureInstalled(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      execFile('continuum', ['--help'], (error) => {
        if (!error) {
          resolve(true);
          return;
        }
        const install = 'Install';
        vscode.window
          .showWarningMessage(
            'Continuum CLI is not installed. Install it to enable server auto-management.',
            install,
            'Cancel',
          )
          .then((choice) => {
            if (choice === install) {
              const terminal = vscode.window.createTerminal('Continuum Install');
              terminal.show();
              terminal.sendText('pip install continuum-context-hub');
            }
            resolve(false);
          });
      });
    });
  }

  async start(): Promise<boolean> {
    if (this.process) {
      const running = await this.isRunning();
      if (running) {
        return true;
      }
      this.killProcess();
    }

    const port = this.getPort();
    this.outputChannel.appendLine(`Starting Continuum server on port ${port}...`);

    try {
      this.process = spawn('continuum', ['serve', '--port', String(port)], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      this.process.stdout?.on('data', (data: Buffer) => {
        this.outputChannel.append(data.toString());
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        this.outputChannel.append(data.toString());
      });

      this.process.on('exit', (code) => {
        this.outputChannel.appendLine(`Server process exited with code ${code}`);
        this.process = undefined;
        if (code !== 0 && code !== null) {
          this.handleCrash();
        }
      });

      // Store PID for crash recovery
      if (this.process.pid) {
        this.context.globalState.update('continuum.serverPid', this.process.pid);
      }

      // Wait for health check to pass
      const healthy = await this.waitForHealthy(10_000);
      if (healthy) {
        this.restartCount = 0;
        this.outputChannel.appendLine('Server is ready.');
      } else {
        this.outputChannel.appendLine('Server failed to become healthy.');
      }
      return healthy;
    } catch (err) {
      this.outputChannel.appendLine(
        `Failed to start server: ${err instanceof Error ? err.message : err}`,
      );
      return false;
    }
  }

  async stop(): Promise<void> {
    this.killProcess();
    this.context.globalState.update('continuum.serverPid', undefined);
    this.outputChannel.appendLine('Server stopped.');
  }

  async restart(): Promise<boolean> {
    await this.stop();
    return this.start();
  }

  async isRunning(): Promise<boolean> {
    try {
      const resp = await axios.get(this.getServerUrl(), { timeout: 2000 });
      return resp.status === 200;
    } catch {
      return false;
    }
  }

  showLogs(): void {
    this.outputChannel.show();
  }

  private killProcess(): void {
    if (this.process) {
      try {
        this.process.kill('SIGTERM');
      } catch {
        // already dead
      }
      // Force kill after 3 seconds
      const proc = this.process;
      setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {
          // already dead
        }
      }, 3000);
      this.process = undefined;
    }
  }

  private async waitForHealthy(timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await this.isRunning()) {
        return true;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  }

  private handleCrash(): void {
    this.restartCount++;
    if (this.restartCount <= this.maxAutoRestarts) {
      this.outputChannel.appendLine(
        `Auto-restarting server (attempt ${this.restartCount}/${this.maxAutoRestarts})...`,
      );
      this.start();
    } else {
      vscode.window
        .showErrorMessage('Continuum server crashed repeatedly.', 'Restart Server', 'Show Logs')
        .then((choice) => {
          if (choice === 'Restart Server') {
            this.restartCount = 0;
            this.start();
          } else if (choice === 'Show Logs') {
            this.showLogs();
          }
        });
    }
  }
}
