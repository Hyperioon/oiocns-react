import Provider from '../../core/provider';
class MarketController {
  /**
   * @description: 默认个人空间
   * @return {*}
   */
  curTarget = Provider.getPerson;

  /**
   * @description: 当前用户
   * @return {*}
   */
  public get userId() {
    return Provider.userId;
  }

  /**
   * @description: 创建商店
   * @return {*}
   */
  public async creatMarkrt({
    name,
    code,
    remark,
    samrId,
    ispublic,
  }: {
    name: string;
    code: string;
    remark: string;
    samrId: string;
    ispublic: boolean;
  }) {
    await this.curTarget?.createMarket({ name, code, remark, samrId, ispublic });
  }

  /**
   * @description: 删除商店
   * @return {*}
   */
  public async deleteMarket(market: any) {
    await this.curTarget?.deleteMarket(market);
  }
}
const marketCtrl = new MarketController();
export { marketCtrl };
