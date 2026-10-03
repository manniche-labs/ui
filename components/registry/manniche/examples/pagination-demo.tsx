import { Pagination } from '@/registry/manniche/pagination/pagination'

export default function PaginationDemo() {
  return (
    <div className="flex justify-center">
      <Pagination total={24} defaultPage={8} onChange={(page) => console.log('load page', page)} />
    </div>
  )
}
