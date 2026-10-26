# Each shop item gets its own address, e.g. eyeseerc.com/shop/forest/: the
# shop page, with that item opened (its photo big and its details box), so
# a print can be shared with a direct link. Made from _data/shop.yml.
module Eyeseerc
  class ShopPages < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      (site.data['shop'] || []).each do |item|
        next unless item.is_a?(Hash) && item['image'] && item['title']
        slug = Jekyll::Utils.slugify(item['title'].to_s)
        next if slug.empty?
        page = Jekyll::PageWithoutAFile.new(site, site.source, "shop/#{slug}", 'index.html')
        page.content = '{% include shop-page.html %}'
        page.data.merge!(
          'layout' => 'default',
          'title' => item['title'].to_s,
          'description' => item['description'].to_s,
          'tight_top' => true,
          'open_print' => slug,
          'shop_item' => true
        )
        site.pages << page
      end
    end
  end
end
