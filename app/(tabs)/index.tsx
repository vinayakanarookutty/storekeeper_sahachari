import { Text, View } from "@/components/Themed";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FlatList, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { getToken } from "../services/auth";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

interface Product {
  _id: string;
  name: string;
  description: string;
  price: string;
  quantity: number;
  category: string;
  images: string[];
}

export default function TabOneScreen() {
  const { token } = useAuth();
  const router = useRouter();

  // Fetch products
  const {
    data: products,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const authToken = await getToken();
      const response = await fetch(`${API_BASE_URL}/storekeeper/products`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json() as Promise<Product[]>;
    },
    enabled: !!token,
  });
  console.log(products);
  const handleProductPress = (product: Product) => {
    router.push({
      pathname: "/product-detail",
      params: {
        product: JSON.stringify(product),
      },
    });
  };
  // Define the S3 Base URL from your environment variables
  const S3_BASE_URL =
    process.env.EXPO_PUBLIC_S3_BASE_URL ||
    "https://sahachari-uploads.s3.ap-south-1.amazonaws.com";
  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleProductPress(item)}
      activeOpacity={0.7}
    >
      {/* Single Image */}
      {item.images && item.images.length > 0 ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: `${S3_BASE_URL}/${item.images[0]}` }}
            style={styles.productImage}
            resizeMode="cover"
          />
          {item.images.length > 1 && (
            <View style={styles.imageCountBadge}>
              <FontAwesome name="image" size={12} color="#fff" />
              <Text style={styles.imageCountText}>{item.images.length}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.noImageContainer}>
          <FontAwesome name="image" size={40} color="#ccc" />
        </View>
      )}

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.productDetails}>
          <Text style={styles.productPrice}>
            ₹{item.price.toLocaleString()}
          </Text>
          <View style={styles.stockBadge}>
            <FontAwesome name="cube" size={12} color="#666" />
            <Text style={styles.productQuantity}>{item.quantity}</Text>
          </View>
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.productCategory}>{item.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Products</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/add-product")}
        >
          <FontAwesome name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : products && products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={refetch}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <FontAwesome name="inbox" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No products yet</Text>
          <Text style={styles.emptySubtext}>
            Tap the + button to add your first product
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9E6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#FFF9E6",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2D2416",
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: "#DAA520",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    gap: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  list: {
    padding: 20,
    paddingTop: 0,
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E0D6C3",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: "row",
    minHeight: 140,
  },
  imageContainer: {
    position: "relative",
    width: "40%",
    backgroundColor: "#f5f5f5",
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  noImageContainer: {
    width: "40%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  imageCountBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  imageCountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  productInfo: {
    padding: 14,
    width: "60%",
  },
  productName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2D2416",
    marginBottom: 6,
  },
  productDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 10,
    lineHeight: 18,
  },
  productDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  productPrice: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#DAA520",
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  productQuantity: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  categoryBadge: {
    alignSelf: "flex-start",
  },
  productCategory: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
});
