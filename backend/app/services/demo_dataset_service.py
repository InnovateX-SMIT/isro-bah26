import os

class DemoDatasetService:
    """
    Service responsible for scanning the repository's datasets/demo directory
    to discover available satellite datasets for simulation/demo workflows.
    """
    @staticmethod
    def discover_demo_datasets() -> list[dict]:
        """
        Scans datasets/demo/ and returns a list of discovered datasets.
        Returns empty list if directory is missing.
        """
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Resolve path up to the project workspace root
        demo_path = os.path.abspath(os.path.join(current_dir, "..", "..", "..", "datasets", "demo"))

        if not os.path.exists(demo_path):
            return []

        discovered = []
        for name in os.listdir(demo_path):
            full_path = os.path.join(demo_path, name)
            # Only consider non-hidden subdirectories
            if os.path.isdir(full_path) and not name.startswith("."):
                # Path relative to project root, formatted standardly
                relative_path = f"datasets/demo/{name}"
                discovered.append({
                    "dataset_name": name,
                    "dataset_path": relative_path,
                    "dataset_type": "DEMO"
                })
        return discovered
