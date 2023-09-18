import React, { useState, useEffect } from 'react';
import { ProFormTreeSelect } from '@ant-design/pro-components';
import { IDepartment } from '@/ts/core';
import orgCtrl from '@/ts/controller';

interface IProps {
  schema: any;
}
interface treeModel {
  key: string;
  label: string;
  value: string;
  children: treeModel[];
}
/**
 * 部门组件
 */
const ProFormDept = (props: IProps) => {
  const [treeData, setTreeData] = useState<treeModel[]>([]);

  const buildDepartments = (departments: IDepartment[]) => {
    const data: treeModel[] = [];
    for (const item of departments) {
      data.push({
        key: item.id,
        label: item.name,
        value: item.id,
        children: buildDepartments(item.children),
      });
    }
    return data;
  };

  useEffect(() => {
    const belong = orgCtrl.targets.find(
      (a) => a.id == props.schema?.metadata?.belongId,
    ) as any;
    setTreeData(buildDepartments(belong.departments));
  }, []);

  return (
    <ProFormTreeSelect
      fieldProps={{
        showSearch: true,
        treeNodeFilterProp: 'label',
        ...{ treeData },
      }}
    />
  );
};

export default ProFormDept;
