export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export type ErrorResponse = ApiResponse<never> & {
  success: false;
  error: string;
};
