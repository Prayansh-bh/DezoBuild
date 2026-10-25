import type { PrismaClient } from '@prisma/client';

export interface ScheduleForecastContextData {
  tenantId: string;
  projectId: string;
  projectName?: string;
  plannedEndDate?: string;
  tasksCount: number;
  completedTasksCount: number;
  delayedTasksCount: number;
  milestonesCount: number;
  tasksSummary: Array<{
    id: string;
    name: string;
    status: string;
    progressPct: number;
    plannedEndDate?: string;
    isMilestone: boolean;
  }>;
}

export class ScheduleForecastContextBuilder {
  constructor(private readonly prisma: PrismaClient) {}

  public async build(tenantId: string, projectId: string): Promise<ScheduleForecastContextData> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        tasks: {
          select: {
            id: true,
            name: true,
            status: true,
            progressPct: true,
            plannedEndDate: true,
            isMilestone: true,
          },
          take: 100,
        },
      },
    });

    if (!project) {
      return {
        tenantId,
        projectId,
        tasksCount: 0,
        completedTasksCount: 0,
        delayedTasksCount: 0,
        milestonesCount: 0,
        tasksSummary: [],
      };
    }

    const tasks = project.tasks || [];
    const now = new Date();
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');
    const delayedTasks = tasks.filter(
      (t) => t.status !== 'COMPLETED' && t.plannedEndDate && t.plannedEndDate < now
    );
    const milestones = tasks.filter((t) => t.isMilestone);

    return {
      tenantId,
      projectId,
      projectName: project.name,
      plannedEndDate: project.plannedEndDate?.toISOString().split('T')[0],
      tasksCount: tasks.length,
      completedTasksCount: completedTasks.length,
      delayedTasksCount: delayedTasks.length,
      milestonesCount: milestones.length,
      tasksSummary: tasks.slice(0, 20).map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        progressPct: Number(t.progressPct),
        plannedEndDate: t.plannedEndDate?.toISOString().split('T')[0],
        isMilestone: t.isMilestone,
      })),
    };
  }
}
