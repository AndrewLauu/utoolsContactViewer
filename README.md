# 通讯录查询

## 功能
- 支持全拼、首拼、正则查询，支持筛选，支持 CSV、vCard (vcf) 格式文件导入
- 适配 uTools 4.0 主面板查询

## 使用方法
导出模板 -> 导入模板 -> 查询
### 导出模板
- 在 uTools 填写关键字`通讯录模板`或`导出模板`，选择保存位置
### 导入模板
1. 复制填完的模板，在 uTools 中粘贴，点击`导入此文件到通讯录`
2. 或者选中模板，唤出超级面板，点击`导入此文件到通讯录`
3. 识别后，会有两个选项
   - `合并导入`：导入模板，不会删除原有通讯录
   - `清空后导入`：先**全部删除**原通讯录，再导入模板
### 查询
- 适配 uTools 4.0，可直接在 uTools 主面板输入查询，或使用`电话本` `通讯录`关键字进入插件内查询
#### 普通查询
- 汉字搜索（“张三”、“财务部”）
  > 返回：张三、财务部
- 全拼搜索（“zhangsan”、“caiwubu”）
  > 返回：张三、财务部
- 简拼搜索（“zs”、“cwb”）
  > 返回：张三、财务部
#### 正则查询
- 正则（“人力.*部”）
  > 返回：人力资源部
#### 筛选
- 支持筛选`姓名` `部门` `电话` `岗位`
- 语法 `筛选项:关键词,查询词`，如`部门:财务,张三`或`bm:财务,岗位:报销,张`
   > 返回：`张三`

|字段|筛选项|
|-|-|
|姓名|姓名、xm|
|部门|部门、bm|
|电话|电话、dh|
|岗位|岗位、gw|


### Contribute
- 项目主页：https://github.com/AndrewLauu/utoolsContactViewer
- 如使用有问题，请评论留言，或主页提issue