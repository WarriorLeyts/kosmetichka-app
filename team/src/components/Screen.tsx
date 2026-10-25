import { useState, type ReactNode, type RefObject } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarSpace } from "./TabBar";
import { TeamHeader } from "./TeamHeader";
import { TitleBar } from "./iosui/TitleBar";

/**
 * Standard screen: safe area, the team header (tab screens) or a back title bar (inner screens),
 * pull-to-refresh, room for the floating tab bar.
 */
export function Screen({
  title, tab, onRefresh, right, children, footer, scrollProps, scrollRef,
}: {
  title?: string;
  tab?: boolean;
  onRefresh?: () => Promise<unknown> | void;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  scrollProps?: ScrollViewProps;
  scrollRef?: RefObject<ScrollView | null>;
}) {
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const [refreshing, setRefreshing] = useState(false);
  return (
    // the keyboard must not cover the chat composer and the inputs of the order / assembly screens:
    // iOS — scroll view insets; Android (edge-to-edge since SDK 54, the window no longer resizes) — padding
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "android" ? "padding" : undefined}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: tab ? tabSpace + 8 : insets.bottom + 24 }}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              tintColor="#8b3dff"
              colors={["#8b3dff"]}
              onRefresh={async () => {
                setRefreshing(true);
                try {
                  await onRefresh();
                } finally {
                  setRefreshing(false);
                }
              }}
            />
          ) : undefined
        }
        {...scrollProps}
      >
        <View style={{ width: "100%", maxWidth: 760, alignSelf: "center" }}>
          {tab ? <TeamHeader title={title} right={right} /> : title ? <TitleBar title={title} /> : null}
          {children}
        </View>
      </ScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
}
