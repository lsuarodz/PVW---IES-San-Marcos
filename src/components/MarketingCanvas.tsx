import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Text, Transformer } from 'react-konva';
import { v4 as uuidv4 } from 'uuid';
import { CanvasElement } from '../types';
import { URLImage } from './URLImage';

interface Props {
  elements: CanvasElement[];
  onChange: (elements: CanvasElement[]) => void;
  width?: number;
  height?: number;
  readOnly?: boolean;
}

const EditableText: React.FC<{
  shapeProps: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newAttrs: CanvasElement) => void;
  readOnly: boolean;
}> = ({ shapeProps, isSelected, onSelect, onChange, readOnly }) => {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      <Text
        onClick={readOnly ? undefined : onSelect}
        onTap={readOnly ? undefined : onSelect}
        onDblClick={() => {
          if (!readOnly) {
            const newText = prompt('Editar texto:', shapeProps.text);
            if (newText !== null) {
              onChange({ ...shapeProps, text: newText });
            }
          }
        }}
        onDblTap={() => {
          if (!readOnly) {
            const newText = prompt('Editar texto:', shapeProps.text);
            if (newText !== null) {
              onChange({ ...shapeProps, text: newText });
            }
          }
        }}
        ref={shapeRef}
        {...shapeProps}
        draggable={!readOnly}
        onDragEnd={(e) => {
          onChange({
            ...shapeProps,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          
          node.scaleX(1);
          node.scaleY(1);
          
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            // For text, resizing generally means increasing fontSize, 
            // but here we can just scale fontSize and width/height.
            fontSize: (shapeProps.fontSize || 20) * scaleX,
            width: Math.max(5, node.width() * scaleX),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && !readOnly && (
        <Transformer
          ref={trRef}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

export default function MarketingCanvas({ elements, onChange, width = 500, height = 500, readOnly = false }: Props) {
  const [selectedId, selectShape] = useState<string | null>(null);

  const checkDeselect = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      selectShape(null);
    }
  };

  const handleElementChange = (newAttrs: CanvasElement, index: number) => {
    const newElements = elements.slice();
    newElements[index] = newAttrs;
    onChange(newElements);
  };

  return (
    <div className={`overflow-hidden relative ${readOnly ? '' : 'border border-stone-200 rounded-lg bg-stone-50'}`} style={{ width, height }}>
      <Stage
        width={width}
        height={height}
        onMouseDown={checkDeselect}
        onTouchStart={checkDeselect}
      >
        <Layer>
          {elements.map((element, i) => {
            if (element.type === 'image') {
              return (
                <URLImage
                  key={element.id}
                  shapeProps={element}
                  isSelected={element.id === selectedId}
                  onSelect={() => {
                    selectShape(element.id);
                  }}
                  onChange={(newAttrs) => {
                    handleElementChange(newAttrs, i);
                  }}
                />
              );
            }
            if (element.type === 'text') {
              return (
                <EditableText
                  key={element.id}
                  shapeProps={element}
                  isSelected={element.id === selectedId}
                  onSelect={() => {
                    selectShape(element.id);
                  }}
                  onChange={(newAttrs) => {
                    handleElementChange(newAttrs, i);
                  }}
                  readOnly={readOnly}
                />
              );
            }
            return null;
          })}
        </Layer>
      </Stage>
    </div>
  );
}
