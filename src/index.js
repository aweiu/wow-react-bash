import React, { Component } from 'react' // eslint-disable-line no-unused-vars
import PropTypes from 'prop-types'
import ReactBash from 'react-bash'
import bashStyles from 'react-bash/es/styles'

// 高亮过滤结果
function highlight (value, text) {
  return (
    <span
      dangerouslySetInnerHTML={{
        __html: value.replace(
          new RegExp(text, 'g'),
          `<span style="background: yellow;">${text}</span>`
        )
      }}
    />
  )
}

export default class Bash extends Component {
  static propTypes = {
    disabled: PropTypes.bool,
    maxHistoryLength: PropTypes.number,
    onAsyncTaskChange: PropTypes.func,
    formatter: PropTypes.func
  }

  state = {
    history: [],
    filterText: ''
  }

  componentWillMount () {
    this.initStyles()
    this.initExtensions()
  }

  componentDidMount () {
    document.addEventListener('keyup', this.handleKeyUp)
    document.addEventListener('click', this.disableBashClick, true)
  }

  componentWillUpdate (nextProps) {
    this.bashInput.disabled = nextProps.disabled
  }

  componentWillUnmount () {
    document.removeEventListener('keyup', this.handleKeyUp)
    document.removeEventListener('click', this.disableBashClick, true)
    this.kill()
  }

  onAsyncTaskChange (command, state) {
    const onAsyncTaskChange = this.props.onAsyncTaskChange
    if (typeof onAsyncTaskChange === 'function') {
      onAsyncTaskChange(command, state)
    }
  }

  onStop = null

  get bashInput () {
    return this.bash.refs.input
  }

  setBashState (state) {
    if (this.bash) {
      for (const name of Object.keys(state)) {
        const val = state[name]
        if (val !== undefined) {
          this.bash.setState({ [name]: val })
        }
      }
    }
  }

  // 命令行窗口内的渲染内容
  get bashHistory () {
    const {
      state: { history, filterText },
      props: { formatter }
    } = this

    let renderHistory
    if (filterText) {
      // 过滤并高亮结果
      renderHistory = history
        .filter(({ value }) => value.includes(filterText))
        .map(({ value }) => ({ value: highlight(value, filterText) }))
    } else {
      // 格式化输出
      renderHistory =
        typeof formatter === 'function'
          ? history.map(({ value }) => ({ value: formatter(value) }))
          : history
    }
    // wrap
    return renderHistory.map(({ value }) => ({
      value: <div style={{ marginBottom: '10px' }}>{value}</div>
    }))
  }

  setHistory (history) {
    if (Array.isArray(history)) {
      // 限制最大容量
      const maxHistoryLength = this.props.maxHistoryLength
      if (maxHistoryLength && history.length > maxHistoryLength) {
        history.splice(0, history.length - maxHistoryLength)
      }
      // 这里后面可以考虑增量更新
      this.setState({ history })
    }
  }

  filter (filterText) {
    this.setState({ filterText })
  }

  async kill () {
    if (this.onStop) {
      await this.onStop()
      this.onStop = null
    }
  }

  exec (command) {
    const { Bash, state } = this.bash
    this.bashInput.focus()
    Bash.execute(command, state)
  }

  // listen ctrl + c on Input
  handleKeyUp = (evt) => {
    if (
      this.bash &&
      this.bashInput === evt.target &&
      this.bash.ctrlPressed &&
      evt.which === 67
    ) {
      this.kill()
    }
  }

  // 解决窗口内文字选中困难的问题
  disableBashClick = (evt) =>
    this.wrapper.contains(evt.target) && evt.stopPropagation()

  // https://github.com/zackargyle/react-bash/issues/26
  initExtensions () {
    const extensions = this.props.extensions
    if (extensions && !this.extensions) {
      this.extensions = {}
      for (const name of Object.keys(extensions)) {
        this.extensions[name] = {
          exec: (state, command) => {
            if (!this.onStop) {
              const onStop = extensions[name].exec(
                { ...state, history: this.state.history },
                command,
                this.expansion
              )
              if (typeof onStop === 'function') {
                const prefixElement = this.bashInput.previousElementSibling
                prefixElement.style.display = 'none'
                this.onAsyncTaskChange(command, 'running')
                this.onStop = async () => {
                  this.onAsyncTaskChange(command, 'end')
                  await onStop()
                  prefixElement.style.display = 'unset'
                }
              }
            }
          }
        }
      }
    }
  }

  // https://github.com/zackargyle/react-bash/issues/40
  initStyles () {
    if (!this.styles) {
      this.styles = {}
      const { theme = ReactBash.Themes.LIGHT, styles = {} } = this.props
      for (const name of Object.keys(styles).concat('input')) {
        const style = styles[name]
        this.styles[name] = Object.assign(
          {},
          bashStyles[theme][name],
          style
        )
      }
      this.styles.input.outline = 'none'
    }
  }

  bash = null
  wrapper = null
  styles = null
  extensions = null
  expansion = {
    setState: ({ structure, history, cwd }) => {
      this.setHistory(history)
      this.setBashState({ structure, cwd })
    }
  }

  render () {
    return (
      <div
        style={{ opacity: this.props.disabled ? '.5' : '1' }}
        ref={(wrapper) => {
          this.wrapper = wrapper
        }}
      >
        <ReactBash
          {...this.props}
          history={this.bashHistory}
          styles={this.styles}
          extensions={this.extensions}
          ref={(bash) => {
            this.bash = bash
          }}
        />
      </div>
    )
  }
}
