import { TagPicker } from '@/registry/manniche/tag-picker/tag-picker'

export default function TagPickerDemo() {
  return (
    <TagPicker
      label="Product tags"
      defaultValue={['linen']}
      options={[
        { id: 'linen', label: 'Linen' },
        { id: 'organic', label: 'Organic' },
        { id: 'handmade', label: 'Handmade' },
        { id: 'summer', label: 'Summer' },
        { id: 'gift', label: 'Gift idea' },
        { id: 'sale', label: 'On sale' },
        { id: 'new', label: 'New in' },
      ]}
    />
  )
}
