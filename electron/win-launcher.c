#define WIN32_LEAN_AND_MEAN
#include <shlobj.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <windows.h>

#define FOOTER_MAGIC "IPTVZIP1"
#define APP_DIR_NAME L"IPTV Client"
#define APP_VER L"1.0.20"
#define APP_EXE L"IPTV Client.exe"

static void fail(const wchar_t *msg) {
  MessageBoxW(NULL, msg, L"IPTV Client", MB_OK | MB_ICONERROR);
}

static int read_footer(HANDLE file, uint64_t *zip_size, uint64_t *zip_off) {
  LARGE_INTEGER size;
  if (!GetFileSizeEx(file, &size) || size.QuadPart < 16) return 0;

  uint8_t tail[16];
  LARGE_INTEGER pos;
  pos.QuadPart = size.QuadPart - 16;
  if (!SetFilePointerEx(file, pos, NULL, FILE_BEGIN)) return 0;
  DWORD got = 0;
  if (!ReadFile(file, tail, 16, &got, NULL) || got != 16) return 0;
  if (memcmp(tail + 8, FOOTER_MAGIC, 8) != 0) return 0;

  memcpy(zip_size, tail, 8);
  if (*zip_size == 0 || *zip_size + 16 > (uint64_t)size.QuadPart) return 0;
  *zip_off = (uint64_t)size.QuadPart - 16 - *zip_size;
  return 1;
}

static int copy_range(HANDLE src, uint64_t off, uint64_t len, const wchar_t *dest) {
  HANDLE out = CreateFileW(dest, GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
  if (out == INVALID_HANDLE_VALUE) return 0;

  LARGE_INTEGER pos;
  pos.QuadPart = (LONGLONG)off;
  if (!SetFilePointerEx(src, pos, NULL, FILE_BEGIN)) {
    CloseHandle(out);
    return 0;
  }

  uint8_t buf[1 << 16];
  uint64_t left = len;
  while (left > 0) {
    DWORD chunk = left > sizeof(buf) ? (DWORD)sizeof(buf) : (DWORD)left;
    DWORD got = 0;
    if (!ReadFile(src, buf, chunk, &got, NULL) || got == 0) {
      CloseHandle(out);
      return 0;
    }
    DWORD put = 0;
    if (!WriteFile(out, buf, got, &put, NULL) || put != got) {
      CloseHandle(out);
      return 0;
    }
    left -= got;
  }
  CloseHandle(out);
  return 1;
}

static int dir_exists(const wchar_t *path) {
  DWORD attr = GetFileAttributesW(path);
  return attr != INVALID_FILE_ATTRIBUTES && (attr & FILE_ATTRIBUTE_DIRECTORY);
}

static int ensure_dir(const wchar_t *path) {
  if (dir_exists(path)) return 1;
  return SHCreateDirectoryExW(NULL, path, NULL) == ERROR_SUCCESS || dir_exists(path);
}

static int extract_zip(const wchar_t *zip, const wchar_t *dest) {
  wchar_t cmd[4096];
  _snwprintf(cmd, 4096, L"tar.exe -xf \"%s\" -C \"%s\"", zip, dest);
  STARTUPINFOW si;
  PROCESS_INFORMATION pi;
  ZeroMemory(&si, sizeof(si));
  si.cb = sizeof(si);
  si.dwFlags = STARTF_USESHOWWINDOW;
  si.wShowWindow = SW_HIDE;
  ZeroMemory(&pi, sizeof(pi));
  wchar_t mutable[4096];
  wcsncpy(mutable, cmd, 4095);
  mutable[4095] = 0;
  if (!CreateProcessW(NULL, mutable, NULL, NULL, FALSE, CREATE_NO_WINDOW, NULL, dest, &si, &pi)) {
    return 0;
  }
  WaitForSingleObject(pi.hProcess, INFINITE);
  DWORD code = 1;
  GetExitCodeProcess(pi.hProcess, &code);
  CloseHandle(pi.hProcess);
  CloseHandle(pi.hThread);
  return code == 0;
}

static int run_app(const wchar_t *exe, const wchar_t *cwd) {
  STARTUPINFOW si;
  PROCESS_INFORMATION pi;
  ZeroMemory(&si, sizeof(si));
  si.cb = sizeof(si);
  ZeroMemory(&pi, sizeof(pi));
  wchar_t cmd[1024];
  _snwprintf(cmd, 1024, L"\"%s\"", exe);
  if (!CreateProcessW(exe, cmd, NULL, NULL, FALSE, 0, NULL, cwd, &si, &pi)) {
    return 0;
  }
  CloseHandle(pi.hProcess);
  CloseHandle(pi.hThread);
  return 1;
}

int WINAPI wWinMain(HINSTANCE inst, HINSTANCE prev, PWSTR cmd, int show) {
  (void)inst;
  (void)prev;
  (void)cmd;
  (void)show;

  wchar_t self[MAX_PATH];
  if (!GetModuleFileNameW(NULL, self, MAX_PATH)) {
    fail(L"无法定位安装包。");
    return 1;
  }

  wchar_t base[MAX_PATH];
  if (FAILED(SHGetFolderPathW(NULL, CSIDL_LOCAL_APPDATA, NULL, 0, base))) {
    fail(L"无法访问本地应用目录。");
    return 1;
  }

  wchar_t appdir[MAX_PATH];
  _snwprintf(appdir, MAX_PATH, L"%s\\%s\\%s", base, APP_DIR_NAME, APP_VER);
  wchar_t exe[MAX_PATH];
  _snwprintf(exe, MAX_PATH, L"%s\\%s", appdir, APP_EXE);

  if (GetFileAttributesW(exe) != INVALID_FILE_ATTRIBUTES) {
    if (!run_app(exe, appdir)) fail(L"无法启动 IPTV Client。");
    return 0;
  }

  HANDLE file = CreateFileW(self, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
  if (file == INVALID_HANDLE_VALUE) {
    fail(L"无法读取安装包，请重新下载完整文件（约 100MB）。");
    return 1;
  }

  uint64_t zip_size = 0, zip_off = 0;
  if (!read_footer(file, &zip_size, &zip_off)) {
    CloseHandle(file);
    fail(L"安装包不完整。请从 GitHub Release 重新下载，文件大约 100MB，不是几十 KB。");
    return 1;
  }

  if (!ensure_dir(appdir)) {
    CloseHandle(file);
    fail(L"无法创建解压目录。");
    return 1;
  }

  wchar_t zip[MAX_PATH];
  _snwprintf(zip, MAX_PATH, L"%s\\payload.zip", appdir);
  if (!copy_range(file, zip_off, zip_size, zip)) {
    CloseHandle(file);
    fail(L"写出安装数据失败。");
    return 1;
  }
  CloseHandle(file);

  if (!extract_zip(zip, appdir) || GetFileAttributesW(exe) == INVALID_FILE_ATTRIBUTES) {
    fail(L"解压失败。请确认系统自带 tar.exe（Windows 10 及以上）。");
    return 1;
  }
  DeleteFileW(zip);

  if (!run_app(exe, appdir)) {
    fail(L"无法启动 IPTV Client。");
    return 1;
  }
  return 0;
}
