import axios from "axios";
import fs from "fs";
import net from "net";
import settings from "electron-settings";
import { exec, spawn, ChildProcessWithoutNullStreams } from "child_process";
import { SD_WEB_UI_SCRIPT_PATH_KEY } from "./settings";

let sdWebUIPort: number = 7860;

async function checkLocalServerStatusRequest(): Promise<boolean> {
  const localServerUrl = `http://0.0.0.0:${sdWebUIPort}`;
  let isLocalServerRunning = false;
  try {
    const response = await axios.get(localServerUrl);
    if (response.status === 200) {
      isLocalServerRunning = true;
    }
  } catch (error: any) {
    isLocalServerRunning = false;
  }
  return isLocalServerRunning;
}

//TODO: let user control port of SDWebUI
//TODO: warn if remote extension intallation is enabled
async function selectFreePort(
  startingPort: number = 7860,
  maxPort: number = 65535
): Promise<number | null> {
  for (let port = startingPort; port <= maxPort; port++) {
    if (await isPortFree(port)) {
      return port;
    }
  }

  return null;
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

async function configureSDWebUIForRemote(port: number): Promise<void> {
  const pathToWebUIUserScript = settings.get(SD_WEB_UI_SCRIPT_PATH_KEY, "");

  if (!fs.existsSync(pathToWebUIUserScript)) {
    throw new Error("Folder is not valid");
  }

  const data = fs.readFileSync(pathToWebUIUserScript, "utf8");
  const lines = data.split("\n");
  let isCommandlineArgsSet = false;
  let commandLineArgs = "";
  lines.forEach((line: string) => {
    if (line.includes("COMMANDLINE_ARGS")) {
      isCommandlineArgsSet = true;
      commandLineArgs = line;
    }
  });

  let finalCommandLineArgs = `set COMMANDLINE_ARGS=--api --api-server-stop --listen --port ${port}`;
  if (isCommandlineArgsSet) {
    const commandLineArgsArray = commandLineArgs
      .split("=")[1]
      .split(" ")
      .map((arg: string) => arg.trim());
    commandLineArgsArray.forEach((arg: string) => {
      if (
        arg.startsWith("--") &&
        arg !== "--api" &&
        arg !== "--api-server-stop" &&
        arg !== "--listen" &&
        arg !== "--port"
      ) {
        finalCommandLineArgs += " " + arg;
      }
    });
  }
  // change the initial command line args to the new ones
  lines.forEach((line: string, index: number) => {
    if (line.includes("COMMANDLINE_ARGS")) {
      lines[index] = finalCommandLineArgs;
    }
  });
  // replace the line with the new one
  const newFileData = lines.join("\n");
  fs.writeFileSync(pathToWebUIUserScript, newFileData);
}

async function startSDWebUILocally(): Promise<void> {
  const path = settings.get(SD_WEB_UI_SCRIPT_PATH_KEY, "");
  const folder = path.split("\\").slice(0, -1).join("\\");
  if (path === "") {
    throw new Error("Path is not set");
  }

  const isLocalServerRunning = await checkLocalServerStatusRequest();

  if (!isLocalServerRunning) {
    //TODO: let user control should console be visible or not
    exec(
      `cmd.exe /K start "SDWebUI" "${path}"`,
      { cwd: folder },
      (err: any) => {
        if (err) {
          console.error(err);
          throw err;
        }
      }
    );
  }
}

async function stopSDWebUIRequest(): Promise<{
  success: boolean;
  msg: string;
}> {
  const stopEndpoint = `http://0.0.0.0:${sdWebUIPort}/sdapi/v1/server-stop`;
  try {
    const response = await axios.post(stopEndpoint);
    if (response.status !== 200) {
      return { success: false, msg: response.data };
    }
    return { success: true, msg: "SDWebUI stopped successfully" };
  } catch (error: any) {
    console.error("Error sending request to server:", error);
    return { success: false, msg: error.message };
  }
}

async function prepareAndStartSDWebUIRequest(force: boolean = false): Promise<{
  success: boolean;
  msg: string;
}> {
  try {
    if ((await checkLocalServerStatusRequest()) === false || force) {
      sdWebUIPort = await selectFreePort();
      await configureSDWebUIForRemote(sdWebUIPort);
      await startSDWebUILocally();
    }
  } catch (error: any) {
    console.error("Error starting SDWebUI:", error);
    return {
      success: false,
      msg: error.message,
    };
  }
  return { success: true, msg: "SDWebUI is running" };
}

export {
  stopSDWebUIRequest,
  checkLocalServerStatusRequest,
  prepareAndStartSDWebUIRequest,
  sdWebUIPort,
};
