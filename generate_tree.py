from pathlib import Path

# Folder to scan (change this or leave "." for current directory)
ROOT = Path(".")

# Output file
OUTPUT_FILE = "folder_structure.txt"

# Ignore these folders/files
IGNORE = {
    ".git",
    ".idea",
    ".vscode",
    "__pycache__",
    "node_modules",
    ".venv",
    "venv",
    "dist",
    "build",
    ".DS_Store"
}


def generate_tree(directory: Path, prefix: str = ""):
    entries = sorted(
        [e for e in directory.iterdir() if e.name not in IGNORE],
        key=lambda x: (x.is_file(), x.name.lower())
    )

    lines = []

    for index, entry in enumerate(entries):
        connector = "└── " if index == len(entries) - 1 else "├── "

        if entry.is_dir():
            lines.append(f"{prefix}{connector}{entry.name}/")
            extension = "    " if index == len(entries) - 1 else "│   "
            lines.extend(generate_tree(entry, prefix + extension))
        else:
            lines.append(f"{prefix}{connector}{entry.name}")

    return lines


def main():
    tree = [f"{ROOT.resolve().name}/"]
    tree.extend(generate_tree(ROOT))

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(tree))

    print(f"Tree written to '{OUTPUT_FILE}'")


if __name__ == "__main__":
    main()