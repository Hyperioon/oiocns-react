import React, { useEffect, useState } from 'react';
import './index.less';
import CardWidthTitle from '@/components/CardWidthTitle';
import orgCtrl from '@/ts/controller';
import TeamIcon from '@/components/Common/GlobalComps/entityIcon';
import { IApplication } from '@/ts/core';
import { useHistory } from 'react-router-dom';
interface SelfAppComType {
  props: []; //入口列表
}
const BannerCom: React.FC<SelfAppComType> = () => {
  const [myApps, setMyApps] = useState<IApplication[]>([]);
  const [shareApps, setShareApps] = useState<IApplication[]>([]);


  useEffect(() => {
    const id = orgCtrl.subscribe(() => {
      loadApps().then((apps) => setMyApps(apps));
    });
    return () => {
      orgCtrl.unsubscribe(id);
    };
  }, []);

  useEffect(() => {
    const id = orgCtrl.subscribe(() => {
      loadShareApps().then((apps) => setShareApps(apps));
    });
    return () => {
      orgCtrl.unsubscribe(id);
    };
  }, []);

  const loadApps = async () => {
    const apps: IApplication[] = [];
    for (const target of orgCtrl.targets) {
      apps.push(...(await target.directory.loadAllApplication()));
    }
    return apps.filter((a, i) => apps.findIndex((x) => x.id === a.id) === i);
  };
  
  const loadShareApps = async () => {
    const apps: IApplication[] = [];
    for (const target of orgCtrl.targets) {
      apps.push(...(await target.directory.loadAllApplication()));
    }
    return apps.filter((a, i) => apps.findIndex((x) => x.id === a.id) !== i);
  };
  return (
    <>
    <CardWidthTitle className="self-app">
        <h3 className='app-title'>常用应用</h3>
        <div className="app-content">
          {shareApps.map((item, index) => {
            return <AppCard className="app-wrap" key={index} app={item} />;
          })}
        </div>
      </CardWidthTitle>
      <CardWidthTitle className="self-app">
        <h3 className='app-title'>我的应用</h3>
        <div className="app-content">
          {myApps.map((item, index) => {
            return <AppCard className="app-wrap" key={index} app={item} />;
          })}
        </div>
      </CardWidthTitle>

      <CardWidthTitle className="self-app">
        <h3 className='app-title'>共享应用</h3>
        <div className="app-content">
          {shareApps.map((item, index) => {
            return <AppCard className="app-wrap" key={index} app={item} />;
          })}
        </div>
      </CardWidthTitle>
    </>
  );
};
const AppCard: any = ({ className, app }: { className: string; app: IApplication }) => {
  const history = useHistory();
  return (
    <div
      className={`${className} app-box`}
      onClick={() => {
        app.loadWorks().then(() => {
          orgCtrl.currentKey = app.key;
          history.push('/store');
        });
      }}>
      <TeamIcon entity={app.metadata} size={50} />
      <div className="app-info">
        <span className="app-info-name">{app.name}</span>
      </div>
    </div>
  );
};
export default BannerCom;
