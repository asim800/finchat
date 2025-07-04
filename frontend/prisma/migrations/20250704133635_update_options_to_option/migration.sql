-- Update existing 'options' asset type to 'option'
UPDATE "assets" SET "assetType" = 'option' WHERE "assetType" = 'options';