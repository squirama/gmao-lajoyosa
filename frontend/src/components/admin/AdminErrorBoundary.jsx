import React from 'react';

export default class AdminErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error('ErrorBoundary caught an error', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 20, color: 'red', background: '#220000', border: '2px solid red', margin: 20 }}>
                    <h2>ERROR DE RENDERIZADO</h2>
                    <p>La aplicacion ha encontrado un error critico.</p>
                    <details style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', background: '#000', padding: 10 }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: 10, cursor: 'pointer' }}>
                        RECARGAR PAGINA
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
