// @ts-nocheck
import React from "react";

type Props = React.PropsWithChildren<{ style?: React.CSSProperties }>;

export default function AppText({ children, style }: Props) {
  return <span style={style}>{children}</span>;
}
