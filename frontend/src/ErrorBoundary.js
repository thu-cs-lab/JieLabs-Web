import React, { Component } from 'react';
import * as Sentry from '@sentry/browser';

import Icon from './comps/Icon';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, evid: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    Sentry.withScope(scope => {
      scope.setExtras(errorInfo);
      const evid = Sentry.captureException(error);
      this.setState({ evid });
    });
  }

  refresh() {
    window.location.reload();
  }

  forceRefresh() {
    window.localStorage.clear();
    window.location.reload(true);
  }

  render() {
    const { children } = this.props;
    if(!this.state.error) return children;

    return (
      <div className="error">
        <div className="error-title">JieLabs 预■体验成员内■版本遇到问题</div>
        <div className="error-subtitle">杰哥正在寻找该问题的解决方案...</div>
        <div className="error-progress"></div>

        <div className="error-desc">
          我们已经收集了错误的基本信息，请尝试刷新能否解决这个问题。如果问题依旧存在，您可以尝试点击下面的按钮清空本地存储并刷新。
        </div>

        <div className="error-actions">
          <button className="error-action labeled-btn" onClick={this.refresh}><Icon>refresh</Icon><span>普通刷新</span></button>
          <button className="error-action labeled-btn" onClick={this.forceRefresh}><Icon>refresh</Icon><span><del>金色普通</del> 清空缓存并刷新</span></button>
        </div>

        <div className="error-evid">{ this.state.evid || '上传中...' }</div>
      </div>
    );
  }
}
