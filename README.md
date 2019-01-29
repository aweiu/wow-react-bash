# wow-react-bash
基于 [react-bash](https://github.com/zackargyle/react-bash) 的 web 命令行组件

## 安装
```
npm install wow-react-bash
```

## 特性
本组件在 [react-bash](https://github.com/zackargyle/react-bash) 的基础上增加了如下特性：
* 支持异步命令及交互
* 支持 filter
* 支持 formatter
* 支持 disabled
* 支持限制最大历史条数
* 更好的样式覆盖
* 新增了一些方法和事件用于和父组件交互
* 拦截了点击自动获取焦点事件，方便复制文字

## Props
### history *移除
请不要直接给该组件传递 history ，否则可能导致数据流异常。请使用[setHistory]()

### styles *增强
* 不会对你的样式文件造成污染
* 会自动 merge 本组件的默认样式，而不是覆盖
* 修复输入框的边框问题
```
{
  ReactBash: {
    border: '1px solid #ddd',
  },
  header: {
    padding: '5px 10px 0'
  }
}
```
更多样式单元可参考[react-bash/styles.js](https://github.com/zackargyle/react-bash/blob/master/src/styles.js)

### extensions *增强
* 支持异步命令和更好的异步交互
* 支持 ctrl + c 终止
```
{
  asyncCommand: {
    // 新增了 setState 函数用于支持异步指令。当然了目前你也只能用该函数实现同步指令了
    exec({ history }, command, { setState }) {
       const timer = setInterval(() => {
         history.push({value: 'test'})
         setState({ history })
       }, 1000)
       
       // 你可以返回一个用于终止此异步任务的函数，命令行会进入异步任务状态
       // 异步任务期间，其他自定义命令不会被执行
       // ctrl + c 或 手动调用 kill 都会触发此函数
       // 支持 Promise
       return () => clearInterval(timer)
    }
  }
}
```
### disabled *新增
是否禁用命令行。默认：false

### maxHistoryLength *新增
用于限制最大历史条数，防止内存占用过多导致浏览器卡死。默认：不限制（0）

### onAsyncTaskChange *新增
当异步任务状态发生变化会触发该回调
```
onAsyncTaskChange (command, state) {
  // command: 同 react-bash
  // state: running 或 end
}
```
### formatter *新增
用于格式化命令行中的内容，可用于代码高亮，数据裁剪等需求
```
formatter (value) {
  // value: 一条 history 内容
  // 返回一个 React Element 或 String 来替换原始内容吧
  return <span styles={{ color: 'yellow' }}>{ value }<span>    
}
```

## 实例方法
```
// 通过 ref 拿到组件实例
<Bash ref={bash => (this.bash = bash)} />
```
### setHistory
设置（重置）命令行内容
```
this.bash.setHistory([{ value: '欢迎使用 wow-react-bash' }])
```
### filter
用于过滤并高亮包含某关键字的数据
> 注意：执行 filter 就不会再执行 formatter，原因是目前 filter 只支持处理原始的纯文本数据
```
this.bash.filter('hello')
this.bash.filter('') // 不过滤
```
### exec
用于执行一条命令行指令，相当于在命令行中输入并回车
```
this.bash.exec('command some args')
```
### kill
用于结束当前的异步任务
```
// 支持 Promise
this.bash.kill()
```
## 其他
### 仍待支持的问题：
* structure 没有做完整的数据代理，某些情况下可能会存在[问题](https://github.com/zackargyle/react-bash/blob/master/src/component.js#L37)
* 由于 history 的数据代理方式，目前 clear 指令只会清屏并不会重置 history
* 覆盖/屏蔽 默认命令
* 更完善的 help，比如支持自定义帮助内容和自定义指令的帮助
* 基于 format 之后数据（React Element）的 filter 
### 讨论
首先为什么要做基于 format 之后数据（React Element）来做 filter ？

假设当前 History 数据为：
```
{ value: 'abcdefg' }
```
你格式化后的内容为
```
{ 
  value:
    <div>
        <span>a</span>
        <a href="">
          <span>b</span>
        </a>
    </div>
}
```
那么实际上显示在命令行中的内容只有「ab」。如果基于原始数据来过滤，用户搜索了「cde」却出现了一个「ab」的结果，显然会造成困惑

那如何基于以上 React Element 做关键词高亮和过滤？
此时我拿到的实际的数据结构类似为：
```
{
  type: 'div',
  children: [
    { type: 'span', children: 'a' }
    { 
      type: 'a', 
      children: [{ type: 'span', children: 'b' }]
    }
  ]
}
```
由于「ab」是个连续的词，而实际它们被分隔到了不同的 Node 节点中，这需要一个高效的算法来深度遍历以上结构去做高亮

倒是有一个比较取巧的方案是通过获取实际 Dom 结构的 innerText 来做，不过最后再考虑它吧

如果你有好的方案，欢迎 PR～


