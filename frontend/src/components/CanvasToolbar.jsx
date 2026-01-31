import {
    Undo,
    Redo,
    Scissors,
    Copy,
    Clipboard,
    Group,
    Ungroup,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignVerticalJustifyCenter,
    AlignHorizontalJustifyCenter,
    AlignVerticalJustifyStart,
    MoveHorizontal,
    MoveVertical,
    ArrowUpToLine,
    ArrowDownToLine
} from 'lucide-react';
import './CanvasToolbar.css';

export default function CanvasToolbar({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    selectedZones = [],
    onCut,
    onCopy,
    onPaste,
    onGroup,
    onUngroup,
    onAlignLeft,
    onAlignCenter,
    onAlignRight,
    onAlignTop,
    onAlignMiddle,
    onAlignBottom,
    onDistributeHorizontal,
    onDistributeVertical,
    onBringForward,
    onSendBackward
}) {
    const hasSelection = selectedZones.length > 0;
    const hasMultipleSelection = selectedZones.length > 1;

    return (
        <div className="canvas-toolbar-actions">
            {/* Undo/Redo */}
            <div className="toolbar-group">
                <button
                    className="toolbar-btn"
                    onClick={onUndo}
                    disabled={!canUndo}
                    title="Undo (Ctrl+Z)"
                >
                    <Undo size={18} />
                </button>
                <button
                    className="toolbar-btn"
                    onClick={onRedo}
                    disabled={!canRedo}
                    title="Redo (Ctrl+Y)"
                >
                    <Redo size={18} />
                </button>
            </div>

            <div className="toolbar-divider" />

            {/* Cut/Copy/Paste */}
            <div className="toolbar-group">
                <button
                    className="toolbar-btn"
                    onClick={onCut}
                    disabled={!hasSelection}
                    title="Cut (Ctrl+X)"
                >
                    <Scissors size={18} />
                </button>
                <button
                    className="toolbar-btn"
                    onClick={onCopy}
                    disabled={!hasSelection}
                    title="Copy (Ctrl+C)"
                >
                    <Copy size={18} />
                </button>
                <button
                    className="toolbar-btn"
                    onClick={onPaste}
                    title="Paste (Ctrl+V)"
                >
                    <Clipboard size={18} />
                </button>
            </div>

            <div className="toolbar-divider" />

            {/* Group/Ungroup */}
            <div className="toolbar-group">
                <button
                    className="toolbar-btn"
                    onClick={onGroup}
                    disabled={!hasMultipleSelection}
                    title="Group"
                >
                    <Group size={18} />
                </button>
                <button
                    className="toolbar-btn"
                    onClick={onUngroup}
                    disabled={!hasSelection}
                    title="Ungroup"
                >
                    <Ungroup size={18} />
                </button>
            </div>

            <div className="toolbar-divider" />

            {/* Alignment */}
            <div className="toolbar-group">
                <button
                    className="toolbar-btn"
                    onClick={onAlignLeft}
                    disabled={!hasMultipleSelection}
                    title="Align Left"
                >
                    <AlignLeft size={18} />
                </button>
                <button
                    className="toolbar-btn"
                    onClick={onAlignCenter}
                    disabled={!hasMultipleSelection}
                    title="Align Center"
                >
                    <AlignHorizontalJustifyCenter size={18} />
                </button>
                <button
                    className="toolbar-btn"
                    onClick={onAlignRight}
                    disabled={!hasMultipleSelection}
                    title="Align Right"
                >
                    <AlignRight size={18} />
                </button>
            </div>

            <div className="toolbar-divider" />

            {/* Vertical Alignment */}
            <div className="toolbar-group">
                <button
                    className="toolbar-btn"
                    onClick={onAlignTop}
                    disabled={!hasMultipleSelection}
                    title="Align Top"
                >
                    <AlignVerticalJustifyStart size={18} />
                </button>
                <button
                    className="toolbar-btn"
                    onClick={onAlignMiddle}
                    disabled={!hasMultipleSelection}
                    title="Align Middle"
                >
                    <AlignVerticalJustifyCenter size={18} />
                </button>
                <button
                    className="toolbar-btn"
                    onClick={onAlignBottom}
                    disabled={!hasMultipleSelection}
                    title="Align Bottom"
                >
                    <AlignVerticalJustifyStart size={18} style={{ transform: 'rotate(180deg)' }} />
                </button>
            </div>

            <div className="toolbar-divider" />

            {/* Distribution */}
            <div className="toolbar-group">
                <button
                    className="toolbar-btn"
                    onClick={onDistributeHorizontal}
                    disabled={!hasMultipleSelection}
                    title="Distribute Horizontally"
                >
                    <MoveHorizontal size={18} />
                </button>
                <button
                    className="toolbar-btn"
                    onClick={onDistributeVertical}
                    disabled={!hasMultipleSelection}
                    title="Distribute Vertically"
                >
                    <MoveVertical size={18} />
                </button>
            </div>

            <div className="toolbar-divider" />

            {/* Layer Order */}
            <div className="toolbar-group">
                <button
                    className="toolbar-btn"
                    onClick={onBringForward}
                    disabled={!hasSelection}
                    title="Bring Forward"
                >
                    <ArrowUpToLine size={18} />
                </button>
                <button
                    className="toolbar-btn"
                    onClick={onSendBackward}
                    disabled={!hasSelection}
                    title="Send Backward"
                >
                    <ArrowDownToLine size={18} />
                </button>
            </div>
        </div>
    );
}
