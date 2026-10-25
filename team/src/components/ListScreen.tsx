import { useState, type ReactElement, type ReactNode } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View, type ListRenderItem } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarSpace } from "./TabBar";
import { TeamHeader } from "./TeamHeader";
import { TitleBar } from "./iosui/TitleBar";

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
  const [refreshing, setRefreshing] = useState(false);
  return (
    <FlatList
      data={data}
      keyExtractor={keyOf}
      renderItem={renderItem}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onEndReachedThreshold={0.4}
      onEndReached={onEnd}
      contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: tab ? tabSpace + 8 : insets.bottom + 24, width: "100%", maxWidth: 760, alignSelf: "center" }}
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
