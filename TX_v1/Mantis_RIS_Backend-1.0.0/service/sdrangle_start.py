import subprocess
import time
import os
import signal
import shlex

def kill_processes_by_pattern(pattern, sig=signal.SIGTERM, wait=3):
    """
    Kill processes matching 'pattern' (uses pgrep -f).
    Tries SIGTERM then after `wait` seconds SIGKILL for leftovers.
    Returns list of killed pids (ints).
    """
    killed = []
    try:
        p = subprocess.Popen(f"pgrep -f {shlex.quote(pattern)}", shell=True,
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, _ = p.communicate(timeout=3)
        pids = [int(x) for x in stdout.split() if x.strip()]
    except subprocess.TimeoutExpired:
        p.kill()
        pids = []
    except Exception:
        pids = []

    for pid in pids:
        try:
            os.kill(pid, sig)
            killed.append(pid)
        except ProcessLookupError:
            pass
        except PermissionError:
            pass

    if wait > 0 and killed:
        time.sleep(wait)

        # Force kill remaining matches
        try:
            p = subprocess.Popen(f"pgrep -f {shlex.quote(pattern)}", shell=True,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            stdout, _ = p.communicate(timeout=3)
            rem = [int(x) for x in stdout.split() if x.strip()]
        except Exception:
            rem = []

        for pid in rem:
            try:
                os.kill(pid, signal.SIGKILL)
                if pid not in killed:
                    killed.append(pid)
            except Exception:
                pass

    return killed

def run_command_in_background(command,
                              log_file_path,
                              pattern_to_kill=None,
                              input_lines=None,
                              use_script=False,
                              use_stdbuf_linebuffer=False,
                              pid_file_path="pid_file.txt"):
    """
    Run `command` in background and redirect stdout+stderr to log_file_path.
    - pattern_to_kill: if provided, kills processes matching pattern before starting.
    - input_lines: optional list of strings to write to stdin (each will be followed by \\n).
    - use_script: if True, runs `script -q -c "command" log_file_path` which preserves TTY-like output.
    - use_stdbuf_linebuffer: if True, prefix command with `stdbuf -oL` to reduce buffering.
    Returns dict with status and pid info.
    """
    result = {"started": False, "pid": None, "killed": [], "error": None}

    try:
        if pattern_to_kill:
            result["killed"] = kill_processes_by_pattern(pattern_to_kill)

        # Prepare final command string
        final_cmd = command
        if use_stdbuf_linebuffer:
            final_cmd = f"stdbuf -oL {final_cmd}"

        if use_script:
            # script preserves terminal behaviors and interactive output, writes to logfile
            final_cmd = f"script -q -c {shlex.quote(final_cmd)} {shlex.quote(log_file_path)}"
            # When using script, we won't open the logfile ourselves; script will write it.
            log_fd = None
        else:
            # open log file in append mode (so multiple runs don't wipe logs)
            log_fd = open(log_file_path, "a", buffering=1)  # line-buffered

        # Start the process
        proc = subprocess.Popen(final_cmd,
                                shell=True,
                                stdout=log_fd if log_fd else subprocess.PIPE,
                                stderr=subprocess.STDOUT,
                                stdin=subprocess.PIPE,
                                text=True,
                                start_new_session=True)

        # If we used script and script wrote PID of child, proc.pid is script's pid.
        # Save pid of the top-level process we launched (useful).
        result["pid"] = proc.pid
        result["started"] = True

        # optionally send initial input lines (if the program expects input)
        if input_lines:
            try:
                for line in input_lines:
                    proc.stdin.write(line + "\n")
                proc.stdin.flush()
            except Exception:
                # Some processes exit immediately or don't accept stdin; ignore errors
                pass

        # Save PID to pid_file_path
        try:
            with open(pid_file_path, "w") as f:
                f.write(str(proc.pid))
        except Exception:
            pass

        # Close our file descriptor if used (process still writes to it)
        if log_fd:
            log_fd.close()

        return result

    except Exception as e:
        # Best-effort cleanup
        try:
            if proc and proc.poll() is None:
                proc.terminate()
        except Exception:
            pass
        return {"started": False, "pid": None, "killed": result.get("killed", []), "error": str(e)}


# --------- Example wrapper for sdrangelsrv ----------
def run_sdrangelsrv():
    """
    Example: kills existing sdrangelsrv processes, then starts sdrangelsrv
    capturing output to sdrangel.log. Uses 'script' fallback to preserve terminal behaviour.
    """
    command = "sdrangelsrv"   # <- change this to the absolute path if needed
    log_file = "sdrangel.log"

    # Option A: simple background run (works for many programs)
    res = run_command_in_background(
        command=command,
        log_file_path=log_file,
        pattern_to_kill="sdrangelsrv",
        input_lines=None,                # e.g. ["comet"] if you need to send an interactive input
        use_script=False,                # change to True if output is only shown in an actual TTY
        use_stdbuf_linebuffer=True,      # reduces output buffering on many commands
        pid_file_path="sdrangelsrv.pid"
    )

    # If the command behaves differently without a TTY (no output in file), retry with `script`:
    if res.get("started") and res.get("pid") and res.get("error") is None:
        # Quick heuristic: if logfile size is tiny after a short wait, try using `script`.
        time.sleep(2)
        try:
            size = os.path.getsize(log_file)
        except Exception:
            size = 0

        if size < 10:
            # Try stronger approach: use `script` to capture terminal output exactly
            print("Small logfile detected — restarting with `script` to capture TTY-like output...")
            # kill previous run
            kill_processes_by_pattern("sdrangelsrv")
            # start again with script
            res = run_command_in_background(
                command=command,
                log_file_path=log_file,
                pattern_to_kill=None,
                input_lines=None,
                use_script=True,
                use_stdbuf_linebuffer=False,
                pid_file_path="sdrangelsrv.script.pid"
            )

    return res


# ---------- Run when executed ----------
if __name__ == "__main__":
    print("Starting sdrangelsrv launcher...")
    out = run_sdrangelsrv()
    print("Result:", out)
    if out.get("error"):
        print("Error:", out["error"])
    else:
        print("Launched PID:", out.get("pid"))
        print("Logs are being appended to sdrangel.log")
