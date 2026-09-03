import {
  ProductDetailsResponseDto,
  ProductResponseDto,
} from './dto/product-response.dto';
import { ProductDetailsRecord, ProductListRecord } from './products.types';

export function formatProduct(product: ProductListRecord): ProductResponseDto {
  return {
    ...product,
    price: product.price.toString(),
  };
}

export function formatProductDetails(
  product: ProductDetailsRecord,
): ProductDetailsResponseDto {
  return {
    ...formatProduct(product),
    category: product.category,
  };
}
