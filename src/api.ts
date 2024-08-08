import axios, { AxiosResponse } from "axios";
import { User, ServerStatus } from "./types";
import { DownloadJob } from "./filemanager";

let currentKey: string = "";

let baseRequest = axios.create({
  headers: {
    Authorization: "Bearer " + currentKey,
  },
});

const host = "https://remotediffusion.com";
// const host = "http://localhost:8080"
const startEndpoint = `${host}/rdapi/start`;
const checkRegisteredEndpoint = `${host}/rdapi/check-registered`;
const registerEndpoint = `${host}/rdapi/register`;
const unregisterEndpoint = `${host}/rdapi/unregister`;
const stopEndpoint = `${host}/rdapi/stop`;
const reportClientActivityEndpoint = `${host}/rdapi/report-client-activity`;
const checkServerActivityEndpoint = `${host}/rdapi/check-server-activity`;
const checkDownloadJobsEndpoint = `${host}/rdapi/check-download-jobs`;
const downloadJobReportEndpoint = `${host}/rdapi/report-download-job-status`;

function setCurrentKey(key: string) {
  currentKey = key;
  setBaseRequestWithNewKey(key);
}

function setBaseRequestWithNewKey(key: string) {
  baseRequest = axios.create({
    headers: {
      Authorization: "Bearer " + key,
    },
  });
}

async function postWithAuth(
  endpoint: string,
  data?: any
): Promise<AxiosResponse<any, any>> {
  return baseRequest.post(endpoint, data);
}

async function getWithAuth(
  enpoint: string,
  data?: any
): Promise<AxiosResponse<any, any>> {
  return baseRequest.get(enpoint, data);
}

async function checkRegisteredKeyRequest(
  currentKey: string
): Promise<{ success: boolean; msg: string }> {
  if (currentKey !== null && currentKey !== "") {
    try {
      const response = await postWithAuth(checkRegisteredEndpoint);
      if (response.status === 200) {
        return { success: true, msg: "Key is registered" };
      } else if (response.status === 404) {
        return { success: false, msg: "Key is not registered" };
      } else {
        return { success: false, msg: `Error checking key: ${response.data}` };
      }
    } catch (error: any) {
      console.error("Error sending request to server:", error);
      return {
        success: false,
        msg: error.response
          ? error.response.data
          : "Error sending request to server",
      };
    }
  }
  return { success: false, msg: "Key is not provided" };
}

async function registerNewKeyRequest(): Promise<{
  success: boolean;
  msg: string;
  key: string;
}> {
  try {
    const response = await axios.post(registerEndpoint);
    if (response.status === 200 || response.status === 304) {
      const user: User = response.data;
      const status =
        response.status === 200 ? "Registered new key" : "Already registered";
      return { success: true, msg: status, key: user.key };
    } else {
      return {
        success: false,
        msg: `Error registering key: ${response.data}`,
        key: "",
      };
    }
  } catch (error: any) {
    console.error("Error sending request to server:", error);
    return {
      success: false,
      msg: error.response
        ? error.response.data
        : "Error sending request to server",
      key: "",
    };
  }
}

async function unregisterKeyRequest(): Promise<{
  success: boolean;
  msg: string;
}> {
  try {
    const response = await postWithAuth(unregisterEndpoint);
    if (response.status === 200) {
      return { success: true, msg: "Key unregistered" };
    } else {
      return {
        success: false,
        msg: `Error unregistering key: ${response.data}`,
      };
    }
  } catch (error: any) {
    console.error("Error sending request to server:", error);
    return {
      success: false,
      msg: error.response
        ? error.response.data
        : "Error sending request to server",
    };
  }
}

async function startRemoteServerRequest(): Promise<{
  success: boolean;
  msg: string;
  data: any;
}> {
  try {
    const response = await postWithAuth(startEndpoint);
    if (response.status === 200) {
      const data = {
        bindPort: response.data.bindPort,
        authToken: response.data.token,
        fileServerPort: response.data.fileServerPort,
      };
      return { success: true, msg: "Server started", data };
    } else {
      return {
        success: false,
        msg: `Error starting server: ${response.data}`,
        data: null,
      };
    }
  } catch (error: any) {
    console.error("Error sending request to server:", error);
    return {
      success: false,
      msg: error.response
        ? error.response.data
        : "Error sending request to server",
      data: null,
    };
  }
}

async function reportClientActivityRequest(): Promise<{
  success: boolean;
  msg: string;
}> {
  try {
    const response = await postWithAuth(reportClientActivityEndpoint);
    if (response.status === 200) {
      return { success: true, msg: "Client started reported" };
    } else {
      return {
        success: false,
        msg: `Error reporting client started: ${response.data}`,
      };
    }
  } catch (error: any) {
    console.error("Error sending request to server:", error);
    return {
      success: false,
      msg: error.response
        ? error.response.data
        : "Error sending request to server",
    };
  }
}

async function stopFrpsServerRequest(): Promise<{
  success: boolean;
  msg: string;
}> {
  try {
    const response = await postWithAuth(stopEndpoint);
    if (response.status === 200) {
      return { success: true, msg: "Server stopped" };
    } else {
      return {
        success: false,
        msg: `Error stopping server: ${response.data}`,
      };
    }
  } catch (error: any) {
    console.error("Error sending request to server:", error);
    return {
      success: false,
      msg: error.response
        ? error.response.data
        : "Error sending request to server",
    };
  }
}

async function checkRemoteServerStatusRequest(): Promise<{
  success: boolean;
  data: ServerStatus | null;
  msg: string;
}> {
  try {
    const response = await getWithAuth(checkServerActivityEndpoint);
    if (
      response.status === 200 &&
      response.data !== undefined &&
      response.data !== null
    ) {
      return {
        success: true,
        data: {
          running: response.data.running,
          bindPort: response.data.bindPort,
          fileServerPort: response.data.fileServerPort,
          token: response.data.token,
        },
        msg: "Server status retrieved",
      };
    } else {
      return {
        success: false,
        data: null,
        msg: `Error reading response: status = ${response.status}`,
      };
    }
  } catch (error: any) {
    console.error("Error checking server status:", error);
    return {
      success: false,
      data: null,
      msg: error.response
        ? error.response.data
        : "Error sending request to server",
    };
  }
}

async function checkDownloadJobsRequest(): Promise<{
  success: boolean;
  data: DownloadJob[] | null;
  msg: string;
}> {
  try {
    const response = await getWithAuth(checkDownloadJobsEndpoint);
    if (response.status === 200) {
      if (response.data === null) {
        return { success: true, data: [], msg: "No jobs found" };
      }
      const jobsData: any[] = response.data;
      const jobs: DownloadJob[] = jobsData.map(DownloadJob.fromJSON);
      return { success: true, data: jobs, msg: "Jobs retrieved" };
    } else {
      return {
        success: false,
        data: null,
        msg: `Error downloading jobs: ${response.status}`,
      };
    }
  } catch (error: any) {
    console.error("Error sending request to server:", error);
    return {
      success: false,
      data: null,
      msg: error.response
        ? error.response.data
        : "Error sending request to server",
    };
  }
}

async function reportDownloadJobStatusRequest(
  job: DownloadJob
): Promise<{ success: boolean; msg: string }> {
  try {
    const response = await postWithAuth(downloadJobReportEndpoint, {
      jobID: job.id,
      status: job.status,
    });
    if (response.status === 200) {
      return { success: true, msg: `Download job reported: ${job.status}` };
    } else {
      return {
        success: false,
        msg: `Error reporting download job status: ${response.data}`,
      };
    }
  } catch (error: any) {
    console.error("Error sending request to server:", error);
    return {
      success: false,
      msg: error.response
        ? error.response.data
        : "Error sending request to server",
    };
  }
}

export {
  setCurrentKey,
  getWithAuth,
  checkRegisteredKeyRequest,
  registerNewKeyRequest,
  unregisterKeyRequest,
  startRemoteServerRequest,
  reportClientActivityRequest,
  stopFrpsServerRequest,
  checkRemoteServerStatusRequest,
  checkDownloadJobsRequest,
  reportDownloadJobStatusRequest,
};

export { currentKey, checkServerActivityEndpoint, checkDownloadJobsEndpoint };
