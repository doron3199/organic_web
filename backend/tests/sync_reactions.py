import json
import os
import subprocess


def sync():
    # Determine paths relative to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Assuming script is in backend/tests/
    project_root = os.path.dirname(os.path.dirname(script_dir))

    frontend_dir = os.path.join(project_root, "frontend")

    # Destination: backend/reaction_meta_tests.json
    out_path = os.path.join(
        project_root, "backend", "tests", "reaction_meta_tests.json"
    )

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

        extracted_json_path = os.path.join(frontend_dir, "reaction_data_extracted.json")
        # Check if file exists
        if os.path.exists(extracted_json_path):
            with open(extracted_json_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4)

            print(f"Successfully synced {len(data['examples'])} examples to {out_path}")

            # Clean up
            try:
                os.remove(extracted_json_path)
            except OSError:
                pass
        else:
            print(f"Error: Extracted JSON file not found at {extracted_json_path}")

    except subprocess.CalledProcessError as e:
        print(f"Error running extraction command: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")


if __name__ == "__main__":
    sync()
