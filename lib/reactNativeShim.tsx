/**
 * React Native Web shim for Next.js
 * Maps React Native primitives to HTML equivalents so RN code compiles on web.
 */
import React from "react";

type ViewProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> & {
  style?: any;
  horizontal?: boolean;
  children?: React.ReactNode;
  [key: string]: any;
};

type TextProps = Omit<React.HTMLAttributes<HTMLSpanElement>, 'style'> & {
  style?: any;
  numberOfLines?: number;
  children?: React.ReactNode;
  [key: string]: any;
};

type PressableProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> & {
  style?: any;
  onPress?: () => void;
  activeOpacity?: number;
  children?: React.ReactNode;
  [key: string]: any;
};

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> & {
  style?: any;
  onChangeText?: (text: string) => void;
  value?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  [key: string]: any;
};

type ImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'style'> & {
  style?: any;
  source?: { uri?: string } | number;
  resizeMode?: string;
  [key: string]: any;
};

type ScrollViewProps = {
  children?: React.ReactNode;
  horizontal?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  showsVerticalScrollIndicator?: boolean;
  contentContainerStyle?: any;
  onScroll?: any;
  refreshControl?: any;
  [key: string]: any;
};

type FlatListProps = {
  data: any[];
  renderItem: (info: { item: any; index: number }) => React.ReactNode;
  keyExtractor?: (item: any, index: number) => string;
  horizontal?: boolean;
  style?: any;
  contentContainerStyle?: any;
  ListHeaderComponent?: React.ReactNode;
  ListFooterComponent?: React.ReactNode;
  ListEmptyComponent?: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  numColumns?: number;
  showsHorizontalScrollIndicator?: boolean;
  showsVerticalScrollIndicator?: boolean;
  ItemSeparatorComponent?: React.ComponentType<any>;
  [key: string]: any;
};

type ModalProps = {
  visible?: boolean;
  transparent?: boolean;
  animationType?: string;
  onRequestClose?: () => void;
  children?: React.ReactNode;
  style?: any;
  [key: string]: any;
};

function rnStyleToCSS(style: any): any {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce((acc: any, s: any) => ({ ...acc, ...rnStyleToCSS(s) }), {});
  }
  return style;
}

export const View: React.FC<ViewProps> = ({ style, horizontal, children, ...rest }) => {
  const css = rnStyleToCSS(style);
  if (horizontal) (css as any).overflowX = (css as any).overflowX || "auto";
  return <div style={{ display: "flex", flexDirection: horizontal ? "row" : "column", ...css }} {...rest}>{children}</div>;
};

export const Text: React.FC<TextProps> = ({ style, numberOfLines, children, ...rest }) => {
  const css = rnStyleToCSS(style);
  if (numberOfLines === 1) { css.overflow = "hidden"; css.textOverflow = "ellipsis"; css.whiteSpace = "nowrap"; }
  return <span style={css} {...rest}>{children}</span>;
};

export const TouchableOpacity: React.FC<PressableProps> = ({ style, onPress, onClick, children, activeOpacity, ...rest }) => (
  <button
    onClick={onPress || onClick}
    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", ...rnStyleToCSS(style) }}
    {...rest}
  >
    {children}
  </button>
);

export const Pressable = TouchableOpacity;
export const TouchableHighlight = TouchableOpacity;
export const TouchableWithoutFeedback: React.FC<PressableProps> = ({ onPress, children, ...rest }) => (
  <div onClick={onPress as unknown as React.MouseEventHandler<HTMLDivElement>} style={{ cursor: "pointer" }}>{children}</div>
);

export const TextInput: React.FC<InputProps> = ({ style, onChangeText, secureTextEntry, multiline, numberOfLines, value, ...rest }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (onChangeText) onChangeText(e.target.value);
  };
  const css = rnStyleToCSS(style);
  if (multiline) {
    return <textarea style={css as any} value={value} onChange={handleChange} rows={numberOfLines || 3} {...(rest as any)} />;
  }
  return <input style={css} type={secureTextEntry ? "password" : "text"} value={value} onChange={handleChange} {...(rest as any)} />;
};

export const Image: React.FC<ImageProps> = ({ style, source, resizeMode, ...rest }) => {
  const src = typeof source === "object" ? source?.uri : undefined;
  const css = rnStyleToCSS(style);
  if (resizeMode) css.objectFit = resizeMode as any;
  return <img src={src} style={css} {...rest} />;
};

export const ScrollView: React.FC<ScrollViewProps> = ({ style, horizontal, contentContainerStyle, showsHorizontalScrollIndicator, showsVerticalScrollIndicator, children, refreshControl, ...rest }) => {
  const css = rnStyleToCSS(style);
  const innerCss = rnStyleToCSS(contentContainerStyle);
  if (horizontal) (css as any).overflowX = "auto";
  else (css as any).overflowY = "auto";
  if (!showsHorizontalScrollIndicator) (css as any).scrollbarWidth = "none";
  return (
    <div style={{ display: "flex", flexDirection: horizontal ? "row" : "column", ...css }} {...rest}>
      <div style={{ display: "flex", flexDirection: horizontal ? "row" : "column", ...innerCss }}>{children}</div>
    </div>
  );
};

export const FlatList: React.FC<FlatListProps> = ({ data, renderItem, keyExtractor, horizontal, style, contentContainerStyle, ListHeaderComponent, ListFooterComponent, ListEmptyComponent, numColumns, ...rest }) => {
  const css = rnStyleToCSS(style);
  const innerCss = rnStyleToCSS(contentContainerStyle);
  const items = data || [];
  return (
    <div style={{ display: "flex", flexDirection: horizontal ? "row" : "column", overflowX: horizontal ? "auto" : undefined, ...css }}>
      {ListHeaderComponent}
      <div style={{ display: "flex", flexDirection: horizontal ? "row" : "column", flexWrap: numColumns && numColumns > 1 ? "wrap" : undefined, ...innerCss }}>
        {items.length === 0 && ListEmptyComponent ? ListEmptyComponent : items.map((item, index) => (
          <div key={keyExtractor ? keyExtractor(item, index) : String(index)}>
            {renderItem({ item, index })}
          </div>
        ))}
      </div>
      {ListFooterComponent}
    </div>
  );
};

export const Modal: React.FC<ModalProps> = ({ visible, children, onRequestClose, ...rest }) => {
  if (!visible) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={(e) => { if (e.target === e.currentTarget && onRequestClose) onRequestClose(); }}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
};

export const ActivityIndicator: React.FC<{ color?: string; size?: number | string; style?: any }> = ({ color, size, style }) => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", ...rnStyleToCSS(style) }}>
    <div className="rn-spinner" style={{ width: 20, height: 20, border: `3px solid ${color || "#000"}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export const KeyboardAvoidingView: React.FC<ViewProps> = ({ children, style, ...rest }) => (
  <div style={{ display: "flex", flexDirection: "column", ...rnStyleToCSS(style) }} {...rest}>{children}</div>
);

export const SafeAreaView = View;
export const RefreshControl: React.FC<any> = () => null;
export const StatusBar: React.FC<any> = () => null;

export const Platform = {
  OS: "web",
  select: (obj: { web?: any; ios?: any; android?: any; default?: any }) => obj.web ?? obj.default,
};

export const Dimensions = {
  get: (dim: "window" | "screen") => {
    if (typeof window === "undefined") return { width: 375, height: 812 };
    return { width: window.innerWidth, height: window.innerHeight };
  },
};

export const StyleSheet = {
  create: <T extends Record<string, any>>(styles: T): T => styles,
  flatten: (style: any): any => {
    if (!style) return {};
    if (Array.isArray(style)) return style.reduce((acc: any, s: any) => ({ ...acc, ...StyleSheet.flatten(s) }), {});
    return style;
  },
  hairlineWidth: 1,
};

export const Animated = {
  Value: class {
    _value: number;
    constructor(v: number) { this._value = v; }
    setValue(v: number) { this._value = v; }
  },
  View: View,
  Text: Text,
  Image: Image,
  spring: (_: any, __: any) => ({ start: (cb?: any) => cb && cb({ finished: true }) }),
  timing: (_: any, __: any) => ({ start: (cb?: any) => cb && cb({ finished: true }) }),
  parallel: (anims: any[]) => ({ start: (cb?: any) => { anims.forEach(a => a.start()); if (cb) cb({ finished: true }); } }),
  sequence: (anims: any[]) => ({ start: (cb?: any) => { anims.forEach(a => a.start()); if (cb) cb({ finished: true }); } }),
  loop: (anim: any) => ({ start: () => {}, stop: () => {} }),
  event: (_: any, __?: any) => () => {},
  createAnimatedComponent: (C: React.ComponentType<any>) => C,
};

export const Alert = {
  alert: (title: string, message?: string, buttons?: Array<{ text: string; onPress?: () => void; style?: string }>) => {
    if (buttons && buttons.length > 0) {
      const ok = window.confirm(message ? `${title}\n\n${message}` : title);
      if (ok) {
        const okBtn = buttons.find(b => b.style !== "cancel");
        if (okBtn?.onPress) okBtn.onPress();
      } else {
        const cancelBtn = buttons.find(b => b.style === "cancel");
        if (cancelBtn?.onPress) cancelBtn.onPress();
      }
    } else {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
  },
};

export const Ionicons: React.FC<{ name: string; size?: number; color?: string; style?: any }> = ({ name, size = 24, color = "currentColor", style }) => (
  <span style={{ fontSize: size, color, ...rnStyleToCSS(style) }} aria-label={name} />
);

export const MaterialIcons: React.FC<{ name: string; size?: number; color?: string; style?: any }> = ({ name, size = 24, color = "currentColor", style }) => (
  <span style={{ fontSize: size, color, ...rnStyleToCSS(style) }} aria-label={name} />
);

export const Entypo: React.FC<{ name: string; size?: number; color?: string; style?: any }> = ({ name, size = 24, color = "currentColor", style }) => (
  <span style={{ fontSize: size, color, ...rnStyleToCSS(style) }} aria-label={name} />
);
