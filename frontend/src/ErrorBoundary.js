import React, { Component } from 'react';

import Icon from './comps/Icon';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(error);
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
        <div className="error-title">Bug 了！</div>
        <div className="error-subtitle">杰哥火速排查中</div>

        <div className="error-desc">
          我们已经收集了错误的基本信息，请尝试刷新能否解决这个问题。如果问题依旧存在，您可以尝试点击下面的按钮清空本地存储并刷新。
        </div>

        <div className="error-actions">
          <button className="error-action labeled-btn" onClick={this.refresh}><Icon>refresh</Icon><span>普通刷新</span></button>
          <button className="error-action labeled-btn" onClick={this.forceRefresh}><Icon>refresh</Icon><span><del>金色普通</del> 清空缓存并刷新</span></button>
        </div>
      </div>
    );
  }
}
