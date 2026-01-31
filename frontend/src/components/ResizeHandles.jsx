import './ResizeHandles.css';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export default function ResizeHandles({ zone, onResizeStart, scale = 1 }) {
    const handleSize = 8 / scale;
    const handleOffset = -handleSize / 2;

    const handleStyle = (position) => {
        const styles = {
            nw: { top: handleOffset, left: handleOffset, cursor: 'nw-resize' },
            n: { top: handleOffset, left: '50%', marginLeft: handleOffset, cursor: 'n-resize' },
            ne: { top: handleOffset, right: handleOffset, cursor: 'ne-resize' },
            e: { top: '50%', right: handleOffset, marginTop: handleOffset, cursor: 'e-resize' },
            se: { bottom: handleOffset, right: handleOffset, cursor: 'se-resize' },
            s: { bottom: handleOffset, left: '50%', marginLeft: handleOffset, cursor: 's-resize' },
            sw: { bottom: handleOffset, left: handleOffset, cursor: 'sw-resize' },
            w: { top: '50%', left: handleOffset, marginTop: handleOffset, cursor: 'w-resize' }
        };
        return {
            ...styles[position],
            width: handleSize,
            height: handleSize
        };
    };

    return (
        <>
            {HANDLES.map((handle) => (
                <div
                    key={handle}
                    className="resize-handle"
                    style={handleStyle(handle)}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        onResizeStart(e, handle);
                    }}
                />
            ))}
        </>
    );
}
