/** Lấy chuỗi lỗi thân thiện từ phản hồi Axios / mạng. */
export function getAxiosErrorMessage(err: unknown, fallback: string): string {
  const parsed = parseApiErrorFromAxios(err, fallback);
  return parsed.message;
}

export type ParsedApiError = {
  message: string;
  detail?: string;
  code?: string;
};

/**
 * Phân tích body lỗi API (message, detail, code) + một số trường hợp mạng/HTTP.
 * Hỗ trợ tương thích server cũ chỉ trả { message: "Sai email" }.
 */
export function parseApiErrorFromAxios(err: unknown, fallback: string): ParsedApiError {
  if (typeof err === "object" && err !== null && "response" in err) {
    const res = (err as { response?: { status?: number; data?: unknown } }).response;
    const status = res?.status;
    const body = res?.data;

    if (body && typeof body === "object") {
      const arr = (body as { errors?: Array<{ msg?: string }> }).errors;
      if (Array.isArray(arr) && arr[0]?.msg?.trim()) {
        return { message: arr[0].msg.trim() };
      }

      const o = body as { message?: unknown; detail?: unknown; code?: unknown };
      const rawMsg = typeof o.message === "string" ? o.message.trim() : "";
      const detail = typeof o.detail === "string" && o.detail.trim() ? o.detail.trim() : undefined;
      let code = typeof o.code === "string" ? o.code : undefined;

      if (!code && rawMsg === "Sai email") {
        code = "EMAIL_NOT_FOUND";
      } else if (!code && rawMsg === "Sai mật khẩu") {
        code = "INVALID_PASSWORD";
      }

      if (code === "EMAIL_NOT_FOUND") {
        const msg =
          rawMsg && rawMsg !== "Sai email"
            ? rawMsg
            : "Không tìm thấy tài khoản với email này.";
        return {
          code,
          message: msg,
          detail:
            detail ||
            "Vui lòng kiểm tra lại địa chỉ email. Nếu chưa có tài khoản, hãy đăng ký mới.",
        };
      }
      if (code === "INVALID_PASSWORD") {
        const msg =
          rawMsg && rawMsg !== "Sai mật khẩu" ? rawMsg : "Mật khẩu không đúng.";
        return {
          code,
          message: msg,
          detail:
            detail ||
            "Vui lòng thử lại và kiểm tra Caps Lock, khoảng trắng thừa ở đầu/cuối mật khẩu.",
        };
      }

      if (rawMsg) {
        return { message: rawMsg, detail, code };
      }

      if (status === 400) {
        return {
          message: fallback,
          detail: "Thông tin gửi lên không hợp lệ. Vui lòng kiểm tra lại email và mật khẩu.",
        };
      }
    }

    if (status === 403) {
      return {
        message: "Không thể thực hiện thao tác.",
        detail: "Phiên đăng nhập có thể đã hết hạn hoặc tài khoản không đủ quyền. Vui lòng thử đăng nhập lại.",
        code: "FORBIDDEN",
      };
    }
    if (status !== undefined && status >= 500) {
      return {
        message: "Máy chủ đang gặp sự cố.",
        detail: "Vui lòng thử lại sau vài phút. Nếu lỗi kéo dài, hãy liên hệ bộ phận hỗ trợ.",
        code: "SERVER_ERROR",
      };
    }
  }

  const anyErr = err as { response?: unknown; message?: string } | undefined;
  if (anyErr && !anyErr.response) {
    if (typeof anyErr.message === "string" && anyErr.message.toLowerCase().includes("network")) {
      return {
        message: "Không kết nối được máy chủ.",
        detail: "Kiểm tra kết nối Internet, tường lửa hoặc thử lại sau.",
        code: "NETWORK_ERROR",
      };
    }
    return {
      message: "Không kết nối được máy chủ.",
      detail: "Kiểm tra kết nối Internet hoặc máy chủ có đang chạy không.",
      code: "NETWORK_ERROR",
    };
  }

  return { message: fallback };
}
