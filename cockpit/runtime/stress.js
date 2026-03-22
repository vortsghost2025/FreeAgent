// Stress computation for adaptive runtime
// Determines system load and decides which agent to use

function computeStress(snapshot) {
  const { cpu, memory, activeTasks } = snapshot;
  
  // Simple stress calculation based on system resources
  const cpuStress = cpu > 80 ? 0.4 : cpu > 50 ? 0.2 : 0;
  const memStress = memory > 80 ? 0.4 : memory > 50 ? 0.2 : 0;
  const taskStress = activeTasks > 5 ? 0.3 : activeTasks > 2 ? 0.15 : 0;
  
  const totalScore = Math.min(cpuStress + memStress + taskStress, 1.0);
  
  return {
    score: totalScore,
    level: totalScore > 0.7 ? 'high' : totalScore > 0.4 ? 'medium' : 'low',
    components: { cpu: cpuStress, memory: memStress, tasks: taskStress }
  };
}

module.exports = { computeStress };
