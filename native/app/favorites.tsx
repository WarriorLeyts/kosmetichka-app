import { FlatList, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavorites } from "@/store/favorites";
import { effectivePriceType } from "@/pricing";
import { ProductCard } from "@/components/ProductCard";
import { Empty } from "@/components/ui";
import { useAddToCart } from "@/useAddToCart";

export default function Favorites() {
  const items = useFavorites((s) => s.items);
  const toggle = useFavorites((s) => s.toggle);
  const customer = useAuth((s) => s.customer);
  const cart = useCartStore((s) => s.items);
  const addToCart = useAddToCart();
  const active = effectivePriceType(cart, customer);

  if (items.length === 0) {
    return (
      <Empty
        icon="heart-outline"
        title="В избранном пусто"
        text="Нажимайте ♡ на товарах, чтобы вернуться к ним позже"
        action="В каталог"
        onAction={() => router.navigate("/catalog")}
      />
    );
  }

  return (
    <FlatList
      data={items}
      numColumns={2}
      keyExtractor={(p) => String(p.id)}
      contentContainerStyle={{ padding: 7 }}
      renderItem={({ item }) => (
        <View style={{ flex: 1 / 2 }}>
          <ProductCard
            product={item}
            customer={customer}
            activePrice={active}
            inCart={cart.find((c) => c.cartKey === String(item.id))?.quantity ?? 0}
            isFavorite
            onAdd={addToCart}
            onFavorite={toggle}
          />
        </View>
      )}
    />
  );
}
