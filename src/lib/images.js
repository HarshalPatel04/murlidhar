const BRANCH_IMAGES = [
    "/branch/img1.png",
    "/branch/img2.png",
    "/branch/img3.png",
    "/branch/img4.png",
    "/branch/img5.png",
];

const CATEGORY_IMAGES = {
    mobile: "/categories/mobile.png",
    mobiles: "/categories/mobile.png",
    smartphone: "/categories/mobile.png",
    smartphones: "/categories/mobile.png",
    "mobile phone": "/categories/mobile.png",
    "mobile phones": "/categories/mobile.png",

    cover: "/categories/cover.png",
    covers: "/categories/cover.png",
    "mobile cover": "/categories/cover.png",
    "mobile covers": "/categories/cover.png",
    case: "/categories/cover.png",
    cases: "/categories/cover.png",

    "tempered glass": "/categories/tempered-glass.png",
    "screen protector": "/categories/tempered-glass.png",
    "screen protectors": "/categories/tempered-glass.png",

    earphones: "/categories/earphone.png",
    earphone: "/categories/earphone.png",
    headphones: "/categories/earphone.png",
    headset: "/categories/earphone.png",
    headsets: "/categories/earphone.png",

    charger: "/categories/charger.png",
    chargers: "/categories/charger.png",
    "charging cable": "/categories/charger.png",
    "charging cables": "/categories/charger.png",

    accessories: "/categories/accessories.png",
};

export function getBranchImage(branch) {
    if (branch?.image_url) {
        return branch.image_url;
    }

    if (!branch?.id) {
        return BRANCH_IMAGES[0];
    }

    const index = [...branch.id].reduce(
        (total, character) => total + character.charCodeAt(0),
        0
    ) % BRANCH_IMAGES.length;

    return BRANCH_IMAGES[index];
}

export function getCategoryImage(category) {
    if (category?.image_url) {
        return category.image_url;
    }

    const name = category?.name
        ?.trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

    return CATEGORY_IMAGES[name] || "/categories/accessories.png";
}

export function getBrandImage(brand) {
    if (brand?.image_url) {
        return brand.image_url;
    }

    const name = brand?.name?.trim().toLowerCase();

    const BRAND_IMAGES = {
        apple: "/brands/Logo.png",
        oppo: "/brands/oppo.png",
        oneplus: "/brands/oneplus.png",
        samsung: "/brands/samsung.png",
        realme: "/brands/realme.png",
        vivo: "/brands/vivo.png",
        redmi: "/brands/redmi.png",
        lava: "/brands/lava.png",
        nothing: "/brands/nothing.png",
        motorola: "/brands/motorola.png",
        tecno: "/brands/tecno.png",
        sony: "/brands/sony.png",
        infinix: "/brands/infinix.png",
        google: "/brands/google.png",
    };

    return BRAND_IMAGES[name] || "/brands/default.png";
}

export function getProductImage(product) {
    if (product?.image_url) {
        return product.image_url;
    }

    return getCategoryImage(product?.category);
}
