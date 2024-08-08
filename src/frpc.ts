import { app } from 'electron';
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import settings from "electron-settings";
import * as keytar from "keytar";
import fs from "fs";
import path from 'path';
import os from 'os';
import { currentKey } from "./api";
import { EventEmitter } from "events";
import { ALLOWED_REMOTE_READ_KEY, FILE_SERVER_FOLDER_PATH_KEY } from "./settings";

let frpcProcess: ChildProcessWithoutNullStreams | null = null;
const frpcEvents = new EventEmitter();
const frpcConfigPath = path.join(os.homedir(), 'remote-diffusion-frpc.toml');


async function configure(
  bindPort: string,
  fileServerPort: string,
  token: string,
  sdWebUIPort: number
) {
  const username = await keytar.getPassword("remote-diffusion", "username");
  const password = await keytar.getPassword("remote-diffusion", "password");
  let frpcConfig = `serverAddr = "remotediffusion.com"
serverPort = ${bindPort}
auth.method = "token"
auth.token = "${token}"
webServer.addr = "127.0.0.1"
webServer.port = 7400
webServer.user = "admin"
webServer.password = "admin"
  
[[proxies]]
name = "SDWebUI"
type = "http"
localIP = "127.0.0.1"
localPort = ${sdWebUIPort}
customDomains = ["${currentKey}.remotediffusion.com"]
httpUser = "${username}"
httpPassword = "${password}"\n`;
  
  let allowedRemoteRead = settings.get(ALLOWED_REMOTE_READ_KEY, false);
  const fileServerFolderPath = settings.get(FILE_SERVER_FOLDER_PATH_KEY, "");
  if (!fs.existsSync(fileServerFolderPath)) {
    frpcEvents.emit("error", {
      success: false,
      msg: "Folder is not valid",
    });
    allowedRemoteRead = false
  }

  // for some reason localPath accepts only forward slashes
  const fileServerFixedPath = fileServerFolderPath.replace(/\\/g, "/");
  const fileServerConfig = `[[proxies]]
name = "files"
type = "tcp"
remotePort = ${fileServerPort}
[proxies.plugin]
type = "static_file"
localPath = "${fileServerFixedPath}"
stripPrefix = "files"
httpUser = "${username}"
httpPassword = "${password}"\n`;

  if (allowedRemoteRead) {
    frpcConfig += fileServerConfig;
  }
  console.log("Allowed remote read: ", allowedRemoteRead);
  fs.writeFileSync(frpcConfigPath, frpcConfig);
}

function start(): void {
  try {
    const frpcPath = path.join(app.getAppPath(), 'frpc.exe');
    frpcProcess = spawn(frpcPath, ["-c", frpcConfigPath]);
    // frpcProcess = spawn("frpc.exe", ["-c", "frpc.toml"]);

    if (frpcProcess.pid === undefined || frpcProcess.pid === null) {
      frpcEvents.emit("error", {
        success: false,
        msg: "Error starting FRPC client: Process ID is null or undefined",
      });
      return;
    }
    frpcProcess.on("error", (err) => {
      frpcEvents.emit("error", {
        success: false,
        msg: "Error starting FRPC client",
      });
    });

    frpcProcess.on("exit", (code, signal) => {
      frpcEvents.emit("exit", {
        success: true,
        msg: `FRPC client exited with code ${code} and signal ${signal}`,
      });
    });

    frpcEvents.emit("start", {
      success: true,
      msg: `FRPC client started. Process ID: ${frpcProcess.pid}`,
    });
  } catch (error) {
    frpcEvents.emit("error", {
      success: false,
      msg: `Error starting FRPC client: ${error}`,
    });
  }
}

async function stop(): Promise<{ success: boolean; msg: string }> {
  if (frpcProcess) {
    let killed = frpcProcess.kill();
    if (killed) {
      return { success: true, msg: "FRPC client stopped" };
    } else {
      return { success: false, msg: "Error stopping FRPC client" };
    }
  } else {
    return { success: false, msg: "FRPC client is not running" };
  }
}

export { configure, start, stop, frpcEvents };
