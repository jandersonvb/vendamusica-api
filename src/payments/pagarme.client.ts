import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';

@Injectable()
export class PagarmeClient {
  private readonly api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: 'https://api.pagar.me/core/v5',
      auth: {
        username: process.env.PAGARME_API_KEY ?? '',
        password: '',
      },
    });
  }

  async post(path: string, data: unknown) {
    try {
      const response = await this.api.post(path, data);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async get(path: string) {
    try {
      const response = await this.api.get(path);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{
        message?: string;
        errors?: unknown;
      }>;
      const message =
        axiosError.response?.data?.message ??
        axiosError.message ??
        'Pagar.me request failed';
      const status = axiosError.response?.status ?? HttpStatus.BAD_GATEWAY;

      throw new HttpException(message, status);
    }

    throw new HttpException('Pagar.me request failed', HttpStatus.BAD_GATEWAY);
  }
}
