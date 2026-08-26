-- STEP 2: seed collections & categories (only collections that actually have product images in /img/상품)
insert into public.collections (name, slug, sort_order) values
('설화먹비','seolhwamukbi',1),
('봄빛연분홍','bombitchyeonbunhong',2),
('묵화연무','mukhwayeonmu',3),
('먹빛화연','meokbitwhayeon',4),
('달빛하얀소복','dalbitwhayansobok',5),
('흑청월화','heukcheongwolhwa',6),
('홍연화담','hongyeonhwadam',7);

insert into public.categories (name, slug, sort_order) values
('한복','hanbok',1),
('액세서리','accessory',2),
('굿즈','goods',3);

insert into public.categories (parent_id, name, slug, sort_order)
select id, '비녀','hairpin',1 from public.categories where slug='accessory'
union all select id,'노리개','norigae',2 from public.categories where slug='accessory'
union all select id,'꽃신','flowershoes',3 from public.categories where slug='accessory';

insert into public.categories (parent_id, name, slug, sort_order)
select id,'아크릴 스탠드','acrylic-stand',1 from public.categories where slug='goods'
union all select id,'복주머니','pouch',2 from public.categories where slug='goods'
union all select id,'포토카드','photocard',3 from public.categories where slug='goods'
union all select id,'키링','keyring',4 from public.categories where slug='goods'
union all select id,'손지갑','handbag',5 from public.categories where slug='goods';
