import { substituteVariables } from '../../utils/variableSubstitution';
import './TextWidget.css';

export default function TextWidget({ config = {}, variableValues = {} }) {
    const {
        content = '',
        html = false,
        style = {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#000000',
            fontWeight: 'normal',
            textAlign: 'left',
            lineHeight: 1.5
        }
    } = config;

    // Substitute variables in content
    const processedContent = substituteVariables(content, variableValues);

    if (!processedContent) {
        return (
            <div className="text-widget">
                <div className="text-empty">No text content</div>
            </div>
        );
    }

    const widgetStyle = {
        fontFamily: style.fontFamily || 'Arial',
        fontSize: `${style.fontSize || 24}px`,
        color: style.color || '#000000',
        fontWeight: style.fontWeight || 'normal',
        textAlign: style.textAlign || 'left',
        lineHeight: style.lineHeight || 1.5,
        padding: style.padding || '10px',
        ...(style.backgroundColor && { backgroundColor: style.backgroundColor }),
        ...(style.borderRadius && { borderRadius: style.borderRadius }),
        ...(style.border && { border: style.border })
    };

    return (
        <div className="text-widget" style={widgetStyle}>
            {html ? (
                <div dangerouslySetInnerHTML={{ __html: processedContent }} />
            ) : (
                <div className="text-content">{processedContent}</div>
            )}
        </div>
    );
}
