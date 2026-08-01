import { Component, type ErrorInfo, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error, info:ErrorInfo){ window.parent?.postMessage({type:'vm:runtime-error',message:error.message,stack:info.componentStack},'*'); }
  render(){return this.state.failed?<main className="error-state"><h1>Something went wrong</h1><p>Refresh the preview or ask VentureMate AI to repair the build.</p></main>:this.props.children;}
}
