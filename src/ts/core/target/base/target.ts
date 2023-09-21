import { schema, model, kernel } from '../../../base';
import { IIdentity, Identity } from '../identity/identity';
import { OperateType, TargetType } from '../../public/enums';
import { PageAll } from '../../public/consts';
import { ITeam, Team } from './team';
import { memberOperates, targetOperates } from '../../public';
import { Directory, IDirectory } from '../../thing/directory';
import { IFileInfo } from '../../thing/fileinfo';
import { DataResource } from '../../thing/resource';
import { ISession, Session } from '../../chat/session';
import { IPerson } from '../person';
import { logger } from '@/ts/base/common';

/** 用户抽象接口类 */
export interface ITarget extends ITeam, IFileInfo<schema.XTarget> {
  /** 会话 */
  session: ISession;
  /** 用户资源 */
  resource: DataResource;
  /** 用户设立的身份(角色) */
  identitys: IIdentity[];
  /** 子用户 */
  subTarget: ITarget[];
  /** 所有相关用户 */
  targets: ITarget[];
  /** 用户相关的所有会话 */
  chats: ISession[];
  /** 成员目录 */
  memberDirectory: IDirectory;
  /** 退出用户群 */
  exit(): Promise<boolean>;
  /** 加载用户设立的身份(角色)对象 */
  loadIdentitys(reload?: boolean): Promise<IIdentity[]>;
  /** 为用户设立身份 */
  createIdentity(data: model.IdentityModel): Promise<IIdentity | undefined>;
  /** 发送身份变更通知 */
  sendIdentityChangeMsg(data: any): Promise<boolean>;
}

/** 用户基类实现 */
export abstract class Target extends Team implements ITarget {
  constructor(
    _metadata: schema.XTarget,
    _relations: string[],
    _user?: IPerson,
    _memberTypes: TargetType[] = [TargetType.Person],
  ) {
    super(_metadata, _relations, _memberTypes);
    this.user = _user || (this as unknown as IPerson);
    this.resource = new DataResource(_metadata, _relations);
    this.directory = new Directory(
      {
        ..._metadata,
        shareId: _metadata.id,
        id: _metadata.id + '_',
        typeName: '目录',
      } as unknown as schema.XDirectory,
      this,
    );
    this.memberDirectory = new Directory(
      {
        ...this.directory.metadata,
        typeName: '成员目录',
        id: _metadata.id + '__',
        name:
          _metadata.typeName === TargetType.Person
            ? '我的好友'
            : `${_metadata.typeName}成员`,
      },
      this,
      this.directory,
    );
    this.session = new Session(this.id, this, _metadata);
    kernel.on(`${_metadata.belongId}-${_metadata.id}-identity`, (data: any) =>
      this._receiveIdentity(data),
    );
  }
  user: IPerson;
  session: ISession;
  directory: IDirectory;
  resource: DataResource;
  identitys: IIdentity[] = [];
  memberDirectory: IDirectory;
  get spaceId(): string {
    return this.space.id;
  }
  get locationKey(): string {
    return this.id;
  }
  private _identityLoaded: boolean = false;
  async loadIdentitys(reload?: boolean | undefined): Promise<IIdentity[]> {
    if (!this._identityLoaded || reload) {
      const res = await kernel.queryTargetIdentitys({
        id: this.id,
        page: PageAll,
      });
      if (res.success) {
        this._identityLoaded = true;
        this.identitys = (res.data.result || []).map((item) => {
          return new Identity(item, this);
        });
      }
    }
    return this.identitys;
  }
  async createIdentity(data: model.IdentityModel): Promise<IIdentity | undefined> {
    data.shareId = this.id;
    const res = await kernel.createIdentity(data);
    if (res.success && res.data?.id) {
      const identity = new Identity(res.data, this);
      this.identitys.push(identity);
      identity._sendIdentityChangeMsg(OperateType.Create, this.metadata);
      return identity;
    }
  }
  override operates(): model.OperateModel[] {
    const operates = super.operates();
    if (this.session.isMyChat) {
      operates.unshift(targetOperates.Chat);
    }
    if (this.members.some((i) => i.id === this.userId)) {
      // operates.unshift(memberOperates.Exit);
    }
    return operates;
  }
  protected async pullSubTarget(team: ITeam): Promise<boolean> {
    const res = await kernel.pullAnyToTeam({
      id: this.id,
      subIds: [team.id],
    });
    if (res.success) {
      await this.sendTargetNotity(OperateType.Add, team.metadata);
    }
    return res.success;
  }
  async loadContent(reload: boolean = false): Promise<boolean> {
    await super.loadContent(reload);
    await this.loadIdentitys(reload);
    return true;
  }
  async rename(name: string): Promise<boolean> {
    return this.update({
      ...this.metadata,
      name: name,
      teamCode: this.metadata.team?.code ?? this.code,
      teamName: this.metadata.team?.name ?? this.name,
    });
  }
  copy(_destination: IDirectory): Promise<boolean> {
    throw new Error('暂不支持.');
  }
  move(_destination: IDirectory): Promise<boolean> {
    throw new Error('暂不支持.');
  }
  abstract exit(): Promise<boolean>;
  abstract get chats(): ISession[];
  abstract get targets(): ITarget[];
  abstract get subTarget(): ITarget[];
  abstract content(_mode?: number | undefined): IFileInfo<schema.XEntity>[];
  createTarget(_data: model.TargetModel): Promise<ITeam | undefined> {
    return new Promise((resolve) => {
      resolve(undefined);
    });
  }
  async sendIdentityChangeMsg(data: any): Promise<boolean> {
    const res = await kernel.dataNotify({
      data: data,
      flag: 'identity',
      onlineOnly: true,
      belongId: this.metadata.belongId,
      relations: this.relations,
      onlyTarget: false,
      ignoreSelf: true,
      targetId: this.metadata.id,
    });
    return res.success;
  }
  private async _receiveIdentity(data: model.IdentityOperateModel) {
    let message = '';
    switch (data.operate) {
      case OperateType.Create:
        message = `${data.operater.name}新增身份【${data.identity.name}】.`;
        if (this.identitys.every((q) => q.id !== data.identity.id)) {
          this.identitys.push(new Identity(data.identity, this));
        }
        break;
      case OperateType.Delete:
        message = `${data.operater.name}将身份【${data.identity.name}】删除.`;
        this.identitys.find((a) => a.id == data.identity.id)?.delete(true);
        break;
      case OperateType.Update:
        message = `${data.operater.name}将身份【${data.identity.name}】信息更新.`;
        this.updateMetadata(data.identity);
        break;
      case OperateType.Remove:
        if (data.subTarget) {
          message = `${data.operater.name}移除赋予【${data.subTarget!.name}】的身份【${
            data.identity.name
          }】.`;
          this.identitys
            .find((a) => a.id == data.identity.id)
            ?.removeMembers([data.subTarget], true);
        }
        break;
      case OperateType.Add:
        if (data.subTarget) {
          message = `${data.operater.name}赋予{${data.subTarget!.name}身份【${
            data.identity.name
          }】.`;
          this.identitys
            .find((a) => a.id == data.identity.id)
            ?.pullMembers([data.subTarget], true);
        }
        break;
    }
    if (message.length > 0) {
      if (data.operater?.id != this.user.id) {
        logger.info(message);
      }
      this.memberDirectory.changCallback();
    }
  }
}
