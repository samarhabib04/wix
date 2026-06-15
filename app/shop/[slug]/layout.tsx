import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getImageUrl, getFullUrl } from '@/lib/config/seo';
import StructuredData from '@/components/seo/StructuredData';
import { generateProductSchema, generateBreadcrumbSchema } from '@/components/seo/StructuredData';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('id, name, description, price, image_url, images, in_stock')
      .eq('slug', slug)
      .single();

    if (error || !product) {
      return {
        title: 'Product Not Found | Dog Quest Shop',
        description: 'The product you are looking for could not be found.',
      };
    }

    const productImages = product.images && Array.isArray(product.images) 
      ? product.images 
      : product.image_url 
        ? [product.image_url] 
        : [];
    const primaryImage = productImages[0] || product.image_url;
    const productImage = primaryImage ? getImageUrl(primaryImage) : SEO_CONFIG.images.default;
    
    const title = `${product.name} | Dog Quest Shop`;
    const description = product.description 
      ? `${product.description.substring(0, 155)}...`
      : `${product.name} - Premium dog product available at Dog Quest Shop. €${product.price}.`;

    const productUrl = getFullUrl(`/shop/${slug}`);

    return generateSEOMetadata({
      title,
      description,
      url: productUrl,
      image: productImage,
      keywords: [
        product.name,
        'dog products',
        'dog accessories',
        'dog supplies',
        'Ireland',
        'dog quest shop',
      ],
      type: 'website',
    });
  } catch (error) {
    console.error('Error generating product metadata:', error);
    return {
      title: 'Product Detail | Dog Quest Shop',
      description: 'View product details and add to cart.',
    };
  }
}

export default async function ProductDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  
  let productSchema = null;
  let breadcrumbSchema = null;

  try {
    const { data: product } = await supabase
      .from('products')
      .select('id, name, description, price, image_url, images, in_stock')
      .eq('slug', slug)
      .single();

    if (product) {
      const productImages = product.images && Array.isArray(product.images) 
        ? product.images 
        : product.image_url 
          ? [product.image_url] 
          : [];
      const primaryImage = productImages[0] || product.image_url;
      const productImage = primaryImage ? getImageUrl(primaryImage) : undefined;

      productSchema = generateProductSchema({
        name: product.name,
        description: product.description || product.name,
        image: productImage ? [productImage] : undefined,
        price: product.price,
        currency: 'EUR',
        availability: product.in_stock ? 'InStock' : 'OutOfStock',
        url: getFullUrl(`/shop/${slug}`),
      });

      breadcrumbSchema = generateBreadcrumbSchema([
        { name: 'Home', url: SEO_CONFIG.siteUrl },
        { name: 'Shop', url: getFullUrl('/shop') },
        { name: product.name, url: getFullUrl(`/shop/${slug}`) },
      ]);
    }
  } catch (error) {
    console.error('Error generating structured data:', error);
  }

  return (
    <>
      {productSchema && <StructuredData data={productSchema} />}
      {breadcrumbSchema && <StructuredData data={breadcrumbSchema} />}
      {children}
    </>
  );
}






























