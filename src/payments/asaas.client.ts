import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import axios, { AxiosError, AxiosInstance } from "axios";

@Injectable()
export class AsaasClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: process.env.ASAAS_BASE_URL ?? "https://api-sandbox.asaas.com/v3",
      headers: {
        access_token: process.env.ASAAS_API_KEY ?? "",
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
  }

  async get<T = unknown>(path: string, params?: Record<string, unknown>) {
    try {
      const { data } = await this.http.get<T>(path, { params });
      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async post<T = unknown>(path: string, body: unknown) {
    try {
      const { data } = await this.http.post<T>(path, body);
      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    const axiosError = error as AxiosError<{
      errors?: Array<{ description?: string }>;
    }>;
    const message =
      axiosError.response?.data?.errors
        ?.map((item) => item.description)
        .filter(Boolean)
        .join("; ") || "Asaas request failed";

    throw new HttpException(message, HttpStatus.BAD_GATEWAY);
  }
}
