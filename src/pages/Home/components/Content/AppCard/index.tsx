import React from 'react';
import { IApplication } from '@/ts/core';
import TeamIcon from '@/components/Common/GlobalComps/entityIcon';
import orgCtrl from '@/ts/controller';
import { useHistory } from 'react-router-dom';

const AppCard: React.FC<{
  title: string;
  dataSource: any;
}> = (props) => {
  const history = useHistory();
  return (
    <>
      <div className="app-title">{props.title}</div>
      <div className="app-content">
        {props.dataSource.map((item: IApplication, index: number) => {
          return (
            <div
              className="app-box"
              key={index}
              onClick={() => {
                item.loadWorks().then(() => {
                  console.log('item',item);return
                  orgCtrl.currentKey = item.key;
                  history.push('/store');
                });
              }}>
              <TeamIcon entity={item.metadata} size={49} />
              <div className="app-info">
                <span className="app-info-name">{item.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
export default AppCard;
