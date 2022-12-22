import type { RefObject, ReactNode } from 'react';
import React, { Suspense, memo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useOutlet } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import LayoutSpin from '@/components/LayoutSpin';

interface Props extends ComponentReactElement {
  maxLen?: number;
}
export const KeepAlive = memo(({ maxLen = 10 }: Props) => {
  const ele = useOutlet();
  const location = useLocation();
  const activeName = location.pathname + location.search;
  const multiTabs = useAppSelector((state) => state.route.multiTabs);
  const levelAsyncRouter = useAppSelector((state) => state.route.levelAsyncRouter);

  const containerRef = useRef<HTMLDivElement>(null);
  const [cacheReactNodes, setCacheReactNodes] = useState<Array<{ name: string; ele?: ReactNode }>>(
    [],
  );

  useEffect(() => {
    if (!activeName) {
      return;
    }
    const include = multiTabs.map((i) => i.key);
    const levelRouter = levelAsyncRouter.map((i) => i.path);
    setCacheReactNodes((reactNodes) => {
      // 缓存超过上限的
      if (reactNodes.length >= maxLen) {
        reactNodes = reactNodes.slice(0, 1);
      }
      // 添加
      const reactNode = reactNodes.find((res) => res.name === activeName);
      if (!reactNode) {
        reactNodes.push({
          name: activeName,
          ele: ele,
        });
      } else {
        // 权限判断
        const nodeParom = reactNodes
          .filter((i) => !levelRouter.includes(i.name))
          .map((i) => i.name);
        const reactIndex = reactNodes.findIndex((res) => nodeParom.includes(res.name));
        if (reactIndex !== -1) reactNodes[reactIndex].ele = ele;
      }

      // 缓存路由列表和标签页列表同步
      if (include) {
        return reactNodes.filter((i) => include.includes(i.name));
      }
      return reactNodes;
    });
  }, [activeName, maxLen, multiTabs, levelAsyncRouter]);

  return (
    <>
      <div ref={containerRef} className="keep-alive" />
      {cacheReactNodes.map((i) => {
        return (
          <Component
            active={i.name === activeName}
            renderDiv={containerRef}
            name={i.name}
            key={i.name}
          >
            {i.ele}
          </Component>
        );
      })}
    </>
  );
});

export interface ComponentReactElement {
  children?: ReactNode | ReactNode[];
}

interface ComponentProps extends ComponentReactElement {
  active: boolean;
  name: string;
  renderDiv: RefObject<HTMLDivElement>;
}

export const Component: React.FC<ComponentProps> = ({ active, children, name, renderDiv }) => {
  const [targetElement] = useState(() => document.createElement('div'));
  const activatedRef = useRef(false);
  activatedRef.current = activatedRef.current || active;

  useEffect(() => {
    if (active) {
      renderDiv.current?.appendChild(targetElement);
    } else {
      try {
        renderDiv.current?.removeChild(targetElement);
        // eslint-disable-next-line no-empty
      } catch (e) {}
    }
  }, [active, name, renderDiv, targetElement]);

  useEffect(() => {
    targetElement.setAttribute('id', name);
  }, [name, targetElement]);

  return (
    <Suspense fallback={<LayoutSpin />}>
      {activatedRef.current && createPortal(children, targetElement)}
    </Suspense>
  );
};
