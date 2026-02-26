-- Migration 002: Add account_codes to custom_groups
-- The original group_codes field stores group-level codes (600, 700, etc.)
-- account_codes stores individual account codes (2000, 2538, etc.) for precise classification

ALTER TABLE public.custom_groups
  ADD COLUMN IF NOT EXISTS account_codes TEXT[] NOT NULL DEFAULT '{}';

-- Drop old seed function and replace with account-code based version
DROP FUNCTION IF EXISTS seed_default_custom_groups(UUID);

CREATE OR REPLACE FUNCTION seed_default_custom_groups(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  -- Only seed if user has no groups yet
  IF EXISTS (SELECT 1 FROM public.custom_groups WHERE user_id = p_user_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.custom_groups (user_id, name, parent_section, display_order, color, account_codes, group_codes)
  VALUES
    -- Revenue
    (p_user_id, 'הכנסות',                          'revenue',        0,  '#10B981', ARRAY['1000'],                                                                                      ARRAY['600','601','602','603']),
    (p_user_id, 'הכנסות פטורות',                   'revenue',        1,  '#6EE7B7', ARRAY['7002'],                                                                                     ARRAY['700']),

    -- Cost of goods
    (p_user_id, 'עלות ייצור - קניות חומר גלם',    'cost_of_goods',  1,  '#EF4444', ARRAY['2000','2009','4595','1559','2200','2001','2002','2003','2004','2005'],                       ARRAY['700','701']),
    (p_user_id, 'עלות ייצור - קניות מוצר מוגמר',  'cost_of_goods',  2,  '#F87171', ARRAY['2101','2102'],                                                                              ARRAY['701']),
    (p_user_id, 'תקורות ייצור',                     'cost_of_goods',  3,  '#FCA5A5', ARRAY['2508','2544','2500','2536'],                                                                ARRAY['702']),
    (p_user_id, 'תפעול מפעל',                       'cost_of_goods',  4,  '#FB923C', ARRAY['2830','2538','2201','2206','2505','2506'],                                                  ARRAY['703']),
    (p_user_id, 'קבלני משנה - לוגיסטיקה',          'cost_of_goods',  5,  '#FDBA74', ARRAY['2571','2527','2529','2510','2511','2523','2524','2501','8789'],                             ARRAY['704']),
    (p_user_id, 'שכר עבודה אריזה',                  'cost_of_goods',  6,  '#FCD34D', ARRAY['2513','2576','2577','2579','2580'],                                                         ARRAY['705']),
    (p_user_id, 'שכר עבודה ייצור',                  'cost_of_goods',  7,  '#F59E0B', ARRAY['2581','2582','2583','2584'],                                                                ARRAY['706']),
    (p_user_id, 'שכר עבודה ליקוט',                  'cost_of_goods',  8,  '#D97706', ARRAY['2586','2587'],                                                                              ARRAY['707']),
    (p_user_id, 'שכר עבודה נהגים',                  'cost_of_goods',  9,  '#B45309', ARRAY['2590','2591','2592','2608'],                                                                ARRAY['713']),

    -- Operating
    (p_user_id, 'הוצ רכבים',                        'operating',     12,  '#3B82F6', ARRAY['2549','2550','2551','2620','2627','2517','2604','3465'],                                    ARRAY['714']),

    -- Admin
    (p_user_id, 'שכר עבודה הנהלה',                  'admin',         10,  '#8B5CF6', ARRAY['2806','2807','2808','2809','2810','2826','2827'],                                           ARRAY['712']),
    (p_user_id, 'שכר עבודה מחסן',                   'admin',         11,  '#A78BFA', ARRAY['2601','2578'],                                                                              ARRAY['711']),
    (p_user_id, 'הנהלה וכלליות',                    'admin',         13,  '#C4B5FD', ARRAY['2562','2563','2567','2554','2535','2545','2546','2539','2540','2542','159','2509','6242'],  ARRAY['709','710']),

    -- Finance
    (p_user_id, 'הוצאות מימון',                     'finance',       14,  '#6366F1', ARRAY['2702','2703','2704','2600'],                                                                ARRAY['715','716','717']);
END;
$$;
