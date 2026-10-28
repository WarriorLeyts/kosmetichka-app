import { useState, type ReactElement, type ReactNode } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View, type ListRenderItem } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarSpace } from "./TabBar";
import { TeamHeader } from "./TeamHeader";
import { TitleBar } from "./iosui/TitleBar";
import { useDesktop } from "../useDesktop";

/** an empty cell that keeps the last odd card half-width in the two-column desktop grid */
const FILLER = Symbol("filler");

/** long lists (orders, customers, products): header + search above, endless loading, pull-to-refresh */
export function ListScreen<T>({
  title, tab, data, renderItem, keyOf, header, onRefresh, onEnd, loadingMore, empty, right,
}: {
  title: string;
  tab?: boolean;
  data: T[];
  renderItem: ListRenderItem<T>;
  keyOf: (item: T) => string;
  header?: ReactNode;
  onRefresh?: () => Promise<unknown>;
  onEnd?: () => void;
  loadingMore?: boolean;
  empty?: ReactElement | null;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const desktop = useDesktop();
  const cols = desktop ? 2 : 1;
  const [refreshing, setRefreshing] = useState(false);
  // computer: two columns of cards; an odd last card gets an empty neighbour so it stays half-width
  const rows: (T | typeof FILLER)[] = cols > 1 && data.length % 2 ? [...data, FILLER] : data;
  return (
    <FlatList<T | typeof FILLER>
      key={cols}
      numColumns={cols}
      columnWrapperStyle={cols > 1 ? { gap: 14 } : undefined}
      data={rows}
      keyExtractor={(x) => (x === FILLER ? "filler" : keyOf(x as T))}
      renderItem={(info) =>
        cols > 1 ? (
          <View style={{ flex: 1, minWidth: 0 }}>{info.item === FILLER ? null : renderItem(info as Parameters<ListRenderItem<T>>[0])}</View>
        ) : (
          renderItem(info as Parameters<ListRenderItem<T>>[0])
        )
      }
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onEndReachedThreshold={0.4}
      onEndReached={onEnd}
      contentContainerStyle={{ paddingTop: insets.top + (desktop ? 12 : 0), paddingHorizontal: desktop ? 32 : 16, paddingBottom: tab ? tabSpace + 8 : insets.bottom + 24, width: "100%", maxWidth: desktop ? 1180 : 760, alignSelf: "center" }}
      ListHeaderComponent={
        <View>
          {tab ? <TeamHeader title={title} right={right} /> : <TitleBar title={title} />}
          {header}
        </View>
      }
      ListEmptyComponent={empty}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color="#8b3dff" /> : null}
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
    />
  );
}
