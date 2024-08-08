import axios from "axios";
import validator from "validator";
import fs from "fs";
import path from "path";
import settings from "electron-settings";
import { EventEmitter } from 'events';
import { checkDownloadJobsRequest, reportDownloadJobStatusRequest } from "./api";
import { FILE_SERVER_FOLDER_PATH_KEY, ALLOWED_REMOTE_READ_KEY, ALLOWED_OVERWRITE_KEY } from "./settings";

const events = new EventEmitter();

let downloadJobs: Set<DownloadJob> = new Set();

enum DownloadJobStatus {
  PENDING = "PENDING",
  DOWNLOADING = "DOWNLOADING",
  CANCELED = "CANCELED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

class DownloadJob {
  id: string;
  url: string;
  filePath: string;
  fileName: string;
  status: DownloadJobStatus;

  static fromJSON(json: any): DownloadJob {
    if (
      json &&
      typeof json.id === "number" &&
      typeof json.url === "string" &&
      isValidUrl(json.url) &&
      typeof json.filePath === "string" &&
      isValidPath(json.filePath) &&
      Object.values(DownloadJobStatus).includes(json.status)
    ) {
      const job = new DownloadJob();
      job.id = json.id;
      job.url = json.url;
      job.filePath = json.filePath;
      job.fileName =
        json.fileName && isValidFilename(json.fileName)
          ? json.fileName
          : getFilenameFromUrl(json.url);
      job.status = json.status;
      return job;
    } else {
      if (typeof json.id !== "number") {
        console.error("Invalid id");
      }
      if (typeof json.url !== "string") {
        console.error("Invalid url");
      }
      if (!isValidUrl(json.url)) {
        console.error("Invalid url");
      }
      if (typeof json.path !== "string") {
        console.error("Invalid path");
      }
      if (!isValidPath(json.path)) {
        console.error("Invalid path");
      }
      if (typeof json.status !== "string") {
        console.error("Invalid status");
      }
      if (!isValidFilename(json.fileName)) {
        console.error("Invalid filename");
      }
      if (!Object.values(DownloadJobStatus).includes(json.status)) {
        console.error("Invalid status");
      }
      throw new Error("Invalid JSON for DownloadJob");
    }
  }

  absolutePath(): string {
    return path.join(
      settings.get(FILE_SERVER_FOLDER_PATH_KEY, ""),
      this.filePath,
      this.fileName
    );
  }
}

function getFilenameFromUrl(fileUrl: string): string {
  const parsedUrl = new URL(fileUrl);
  return path.basename(parsedUrl.pathname || "");
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    console.error("Invalid URL");
    return false;
  }
}

function isValidPath(fileLocalPath: string): boolean {
  const fileServerFolderPath = settings.get(FILE_SERVER_FOLDER_PATH_KEY, "");
  const filePath = path.join(fileServerFolderPath, fileLocalPath);
  const isDirectory =
    fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory();
  const canWrite = fs.accessSync(filePath, fs.constants.W_OK);
  const res = isDirectory && (canWrite === undefined || canWrite === null);
  if (!res) {
    console.error("Invalid path: ", filePath);
  }
  return res;
}

function isValidFilename(string: string): boolean {
  const fileName = string;
  const isValid = fileName !== "";
  if (!isValid) {
    console.error("Invalid filename: ", fileName);
  }
  return isValid;
}

async function downloadFile(
  url: string,
  absolutePath: string,
  progressCallback?: (progress: number) => void
): Promise<void> {
  if (!validator.isURL(url)) {
    throw new Error("Invalid URL");
  }

  // if (fs.existsSync(absolutePath)) {
  //   throw new Error("File already exists");
  // }

  const writer = fs.createWriteStream(absolutePath);

  try {
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
      timeout: 60000,
      maxRedirects: 5,
    });

    if (response.status !== 200) {
      throw new Error(`Request failed with status code ${response.status}`);
    }

    if (progressCallback) {
      const totalSize = parseInt(response.headers["content-length"], 10);
      let downloadedSize = 0;

      response.data.on("data", (chunk: Buffer) => {
        downloadedSize += chunk.length;
        const progress = (downloadedSize / totalSize) * 100;
        progressCallback(progress);
      });
    }

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", (error) => {
        console.error("Error writing file:", error);
        reject(error);
      });
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
}

async function checkDownloadJobsPeriodically(): Promise<void> {
  while (true) {
    const jobs = await fetchDownloadJobs();
    jobs.forEach((job) => {
      downloadJobs.add(job);
    });
    await downloadPendingJobs();
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

async function fetchDownloadJobs(): Promise<DownloadJob[]> {
  const { success, data, msg } = await checkDownloadJobsRequest();
  if (success) {
    return data;
  } else {
    console.error(msg);
    return [];
  }
}

async function downloadPendingJobs(): Promise<void> {
  for (const job of downloadJobs) {
    if (job.status === DownloadJobStatus.PENDING) {
      const allowedRemoteRead = settings.get(ALLOWED_REMOTE_READ_KEY, false);
      const fileExists = fs.existsSync(job.absolutePath());
      const allowedOverwriting = settings.get(ALLOWED_OVERWRITE_KEY, false);
      if (!allowedRemoteRead) {
        job.status = DownloadJobStatus.FAILED;
        reportDownloadJobStatus(job);
        return;
      }
      if (fileExists && !allowedOverwriting) {
        job.status = DownloadJobStatus.FAILED;
        reportDownloadJobStatus(job);
        return;
      }
      job.status = DownloadJobStatus.DOWNLOADING;
      reportDownloadJobStatus(job);
      
      downloadFile(job.url, job.absolutePath())
        .then(() => {
          job.status = DownloadJobStatus.COMPLETED;
          reportDownloadJobStatus(job);
        })
        .catch((error) => {
          console.error("Error downloading file:", error);
          job.status = DownloadJobStatus.FAILED;
          reportDownloadJobStatus(job);
        });
    }
  }
}

async function reportDownloadJobStatus(job: DownloadJob): Promise<void> {
  const { msg } = await reportDownloadJobStatusRequest(job);
  events.emit('statusUpdated', msg);
}

export { events, DownloadJob, checkDownloadJobsPeriodically, fetchDownloadJobs, downloadPendingJobs, reportDownloadJobStatus};
