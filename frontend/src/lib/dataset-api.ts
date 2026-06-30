import { Dataset, DemoDataset, DatasetCreatePayload } from "./types/dataset";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getDemoDatasets(): Promise<DemoDataset[]> {
  const res = await fetch(`${API_URL}/api/v1/datasets/demo`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch demo datasets");
  }
  return await res.json();
}

export async function registerDataset(payload: DatasetCreatePayload): Promise<Dataset> {
  const res = await fetch(`${API_URL}/api/v1/datasets/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to register dataset" }));
    throw new Error(errorData.detail || "Failed to register dataset");
  }
  return await res.json();
}

export async function getRegisteredDatasets(): Promise<Dataset[]> {
  const res = await fetch(`${API_URL}/api/v1/datasets`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch registered datasets");
  }
  return await res.json();
}

export async function getDataset(id: string): Promise<Dataset> {
  const res = await fetch(`${API_URL}/api/v1/datasets/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch dataset ${id}`);
  }
  return await res.json();
}

export async function getSessionDatasets(sessionId: string): Promise<Dataset[]> {
  const res = await fetch(`${API_URL}/api/v1/datasets/session/${sessionId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch datasets for session ${sessionId}`);
  }
  return await res.json();
}

export async function deleteDataset(id: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/v1/datasets/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to delete dataset registration" }));
    throw new Error(errorData.detail || "Failed to delete dataset registration");
  }
  return true;
}

export async function uploadDataset(
  sessionId: string,
  datasetName: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("analysis_session_id", sessionId);
    formData.append("dataset_name", datasetName);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/api/v1/datasets/upload`);

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch (e) {
          reject(new Error("Failed to parse upload response"));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.detail || "Upload failed"));
        } catch (e) {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during upload"));
    };

    xhr.send(formData);
  });
}

export async function finalizeUpload(payload: {
  temp_session_id: string;
  analysis_session_id: string;
  dataset_name: string;
  metadata: {
    acquisition_date: string;
    crs: string;
    latitude: number;
    longitude: number;
    sensor: string;
    satellite: string;
  };
}): Promise<Dataset> {
  const res = await fetch(`${API_URL}/api/v1/datasets/upload/finalize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to finalize dataset registration" }));
    throw new Error(errorData.detail || "Failed to finalize dataset registration");
  }
  return await res.json();
}


