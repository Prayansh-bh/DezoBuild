export interface ProjectMemberEntity {
  id: string;
  tenantId: string;
  projectId: string;
  userId: string;
  projectRole: string;
  isLead: boolean;
  joinedAt: Date;
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
  project?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface AddProjectMemberParams {
  tenantId: string;
  projectId: string;
  userId: string;
  projectRole?: string;
  isLead?: boolean;
}

export interface IProjectMemberRepository {
  addMember(params: AddProjectMemberParams): Promise<ProjectMemberEntity>;
  removeMember(tenantId: string, projectId: string, userId: string): Promise<boolean>;
  findMember(tenantId: string, projectId: string, userId: string): Promise<ProjectMemberEntity | null>;
  findUserProjects(tenantId: string, userId: string): Promise<ProjectMemberEntity[]>;
  findProjectMembers(tenantId: string, projectId: string): Promise<ProjectMemberEntity[]>;
  isUserProjectMember(tenantId: string, projectId: string, userId: string): Promise<boolean>;
}
