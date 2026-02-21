import os
import subprocess


def sync():
    # Determine paths relative to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Assuming script is in backend/tests/
    project_root = os.path.dirname(os.path.dirname(script_dir))

    frontend_dir = os.path.join(project_root, "frontend")

    print("Syncing reactions using npx tsx...")

    try:
        # Run extraction script directly using tsx
        # This requires 'tsx' to be installed or available via npx
        cmd = ["npx", "tsx", "scripts/extract_reaction_data.ts"]

        # Use shell=True on Windows to handle batch files and path resolution correclty
        is_windows = os.name == "nt"
        if is_windows:
            cmd[0] = "npx.cmd"

        print(f"Running command: {' '.join(cmd)} in {frontend_dir}")
        subprocess.run(cmd, cwd=frontend_dir, check=True, shell=is_windows)

        # Move the extracted file to backend/tests/reaction_meta_tests.json
        src = os.path.join(frontend_dir, "reaction_data_extracted.json")
        dst = os.path.join(script_dir, "reaction_meta_tests.json")

        import shutil

        if os.path.exists(src):
            # Explicitly remove destination if it exists to ensure overwrite
            if os.path.exists(dst):
                try:
                    os.remove(dst)
                    print(f"Removed existing destination: {dst}")
                except OSError as e:
                    print(f"Error removing {dst}: {e}")

            shutil.move(src, dst)
            print(f"Moved {src} to {dst}")
        else:
            print(f"Error: Extracted file not found at {src}")

    except subprocess.CalledProcessError as e:
        print(f"Error running extraction command: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")


if __name__ == "__main__":
    sync()
