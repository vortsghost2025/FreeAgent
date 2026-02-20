"""
progression_tracker.py
Tracks long-term progression for persistent universe (Phase XI).
"""
class ProgressionTracker:
    def __init__(self):
        self.milestones = []

    def add_milestone(self, milestone):
        self.milestones.append(milestone)

    def get_milestones(self):
        return self.milestones

    def milestone_summary(self):
        """Return a summary of all milestones."""
        return f"Total milestones: {len(self.milestones)}\n" + '\n'.join(map(str, self.milestones))

    def clear_milestones(self):
        """Clear all milestones."""
        self.milestones.clear()
